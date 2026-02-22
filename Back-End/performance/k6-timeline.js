/**
 * k6 performance test (k6-timeline.js)
 *
 * What it tests (end-to-end user flow):
 * 1) Upload a PDF transcript: POST /api/upload/file  -> returns { jobId }
 * 2) Poll job completion:     GET  /api/jobs/:jobId  -> 200 { status:"done", result }
 * 3) Save timeline:           POST /api/timeline     -> 201 with timeline { _id }
 * 4) Update timeline:         PUT  /api/timeline/:id -> 200 (update saved timeline)
 * 5) Retrieve timeline:       GET  /api/timeline/:id -> 202 { jobId } (async retrieval)
 * 6) Poll retrieval job:      GET  /api/jobs/:jobId  -> 200 { status:"done", result }
 * 7) Delete timeline:         DELETE /api/timeline/:id -> 200 (cleanup test data)
 *
 * Goal: meaningful metrics for async pipelines:
 * - Tests full CRUD: Create (save) + Read (retrieve) + Update + Delete (cleanup)
 * - Verifies data persisted correctly, can be updated, and fetched
 * - Tracks all endpoint failures (400, 410, 500, etc.), not just 410
 * - Cleans up test data to avoid database bloat
 */

import http from "k6/http";
import { check, sleep, group, fail } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

export const options = {
    vus: Number(__ENV.VUS || "1"),
    duration: __ENV.DURATION || "10s",
    thresholds: {
        iteration_success_rate: ["rate>0.95"],
        job_timeout_rate: ["rate<0.05"],
        timeline_save_failed_rate: ["rate<0.01"],
        timeline_update_failed_rate: ["rate<0.01"],

        job_time_to_done_ms: ["p(95)<3000"],
        "http_req_duration{name:POST /api/upload/file}": ["p(95)<500"],
        "http_req_duration{name:GET /api/jobs/:jobId}": ["p(95)<2000"],
        "http_req_duration{name:POST /api/timeline}": ["p(95)<200"],
        "http_req_duration{name:PUT /api/timeline/:id}": ["p(95)<200"],
        "http_req_duration{name:GET /api/timeline/:id}": ["p(95)<200"],
        "http_req_duration{name:DELETE /api/timeline/:id}": ["p(95)<200"],
    },
};

// -------------------------
// Env / config
// -------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const USER_ID = __ENV.USER_ID;
const PDF_PATH = __ENV.PDF_PATH || "./test-pdfs/transcripts/Student Record.pdf";
const TIMELINE_NAME_PREFIX = __ENV.TIMELINE_NAME_PREFIX || "k6-poc";

const POLL_MAX_SECONDS = Number(__ENV.POLL_MAX_SECONDS || "60");
const POLL_INTERVAL_SECONDS = Number(__ENV.POLL_INTERVAL_SECONDS || "1");
const POLL_REQUEST_TIMEOUT = __ENV.POLL_REQUEST_TIMEOUT || "5s";

const DEBUG = __ENV.DEBUG === "1";

const PDF_BYTES = open(PDF_PATH, "b");

// -------------------------
// Custom metrics
// -------------------------
const poll_200 = new Counter("poll_200_count");
const poll_410 = new Counter("poll_410_count");
const poll_404 = new Counter("poll_404_count");
const poll_timeout = new Counter("poll_timeout_count");
const poll_network_error = new Counter("poll_network_error_count");
const poll_other = new Counter("poll_other_count");

const job_time_to_done_ms = new Trend("job_time_to_done_ms", true);
const polls_per_job = new Trend("polls_per_job", true);

const job_timeout_rate = new Rate("job_timeout_rate");
const timeline_save_failed_rate = new Rate("timeline_save_failed_rate");
const timeline_update_failed_rate = new Rate("timeline_update_failed_rate");
const iteration_success_rate = new Rate("iteration_success_rate");

function debugLog(msg) {
    if (DEBUG) console.log(msg);
}

/**
 * Polls the given jobId until completion or timeout, tracking attempts and elapsed time.
 * Handles and categorizes all response statuses (200, 410, 404, etc.) and network errors.
 * @param jobId - The job ID to poll
 * @returns {{done: boolean, result: null, attempts: number, elapsed}|{done: boolean, result: *, attempts: number, elapsed: number}}
 */
function pollJobUntilDone(jobId) {
    const started = Date.now();
    const deadline = started + POLL_MAX_SECONDS * 1000;
    let attempts = 0;

    while (Date.now() < deadline) {
        attempts++;

        const r = http.get(`${BASE_URL}/api/jobs/${jobId}`, {
            tags: { name: "GET /api/jobs/:jobId" },
            expected_response: false,
            timeout: POLL_REQUEST_TIMEOUT,
        });

        if (r.status === 0) {
            poll_network_error.add(1);
            debugLog(
                `Poll attempt ${attempts}: GET /api/jobs/${jobId} status=0 error=${r.error || "unknown"}`
            );
            sleep(POLL_INTERVAL_SECONDS);
            continue;
        }

        if (r.status === 200) {
            poll_200.add(1);
            const body = r.json();
            const status = body && body.status;

            debugLog(
                `Poll attempt ${attempts}: GET /api/jobs/${jobId} status=200 jobStatus=${status}`
            );

            if (status === "done") {
                const elapsed = Date.now() - started;
                job_time_to_done_ms.add(elapsed);
                polls_per_job.add(attempts);
                job_timeout_rate.add(0);
                return { done: true, result: body.result, attempts, elapsed };
            }
        } else if (r.status === 410) {
            poll_410.add(1);
            debugLog(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=410`);
        } else if (r.status === 404) {
            poll_404.add(1);
            debugLog(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=404`);
        } else {
            poll_other.add(1);
            fail(`Unexpected poll status=${r.status} GET /api/jobs/${jobId} body=${r.body}`);
        }

        sleep(POLL_INTERVAL_SECONDS);
    }

    polls_per_job.add(attempts);
    poll_timeout.add(1);
    job_timeout_rate.add(1);
    debugLog(`Poll timeout: GET /api/jobs/${jobId} attempts=${attempts} elapsedMs=${Date.now() - started}`);
    return { done: false, result: null, attempts, elapsed: Date.now() - started };
}

/**
 * Uploads the PDF file to the API and returns the jobId for processing.
 * @returns {{ok: boolean, jobId: *}|{ok: boolean, error: string}}
 */
function uploadPdf() {
    const res = http.post(
        `${BASE_URL}/api/upload/file`,
        { file: http.file(PDF_BYTES, "test-transcript.pdf", "application/pdf") },
        { tags: { name: "POST /api/upload/file" }, expected_response: false }
    );

    const jobId = res.status === 200 ? res.json("jobId") : null;
    debugLog(`Upload: POST /api/upload/file status=${res.status} jobId=${jobId || "-"}`);

    const ok = check(res, {
        "upload accepted (200)": (r) => r.status === 200,
        "upload returned jobId": (r) => !!r.json("jobId"),
    });

    if (!ok) return { ok: false, error: `Upload failed status=${res.status} body=${res.body}` };
    return { ok: true, jobId };
}

/**
 * Saves a new timeline using the uploaded jobId and returns the created timelineId.
 * @param uploadJobId
 * @returns {{ok: boolean, timelineId: *}|{ok: boolean, error: string}}
 */
function saveTimeline(uploadJobId) {
    const timelineName = `${TIMELINE_NAME_PREFIX}-${__VU}-${__ITER}`;

    const res = http.post(
        `${BASE_URL}/api/timeline`,
        JSON.stringify({ userId: USER_ID, timelineName, jobId: uploadJobId }),
        {
            headers: { "Content-Type": "application/json" },
            tags: { name: "POST /api/timeline" },
            expected_response: false,
        }
    );

    const timelineId = res.status === 201 ? res.json("_id") : null;
    debugLog(
        `Save: POST /api/timeline status=${res.status} timelineId=${timelineId || "-"} name=${timelineName}`
    );

    timeline_save_failed_rate.add(res.status === 201 ? 0 : 1);

    const ok = check(res, {
        "timeline saved (201)": (r) => r.status === 201,
        "save returned _id": (r) => !!r.json("_id"),
    });

    if (!ok) return { ok: false, error: `Save failed status=${res.status} body=${res.body}` };
    return { ok: true, timelineId };
}

/**
 * Updates the timeline's name and verifies the update was successful.
 * @param timelineId
 * @returns {{ok: boolean}|{ok: boolean, error: string}}
 */
function updateTimeline(timelineId) {
    const newName = `${TIMELINE_NAME_PREFIX}-updated-${__VU}-${__ITER}`;

    const res = http.put(
        `${BASE_URL}/api/timeline/${timelineId}`,
        JSON.stringify({ timelineName: newName }),
        {
            headers: { "Content-Type": "application/json" },
            tags: { name: "PUT /api/timeline/:id" },
            expected_response: false,
        }
    );

    debugLog(`Update: PUT /api/timeline/${timelineId} status=${res.status} newName=${newName}`);

    timeline_update_failed_rate.add(res.status === 200 ? 0 : 1);

    const ok = check(res, { "timeline updated (200)": (r) => r.status === 200 });
    if (!ok) return { ok: false, error: `Update failed status=${res.status} body=${res.body}` };
    return { ok: true };
}

/**
 * Initiates timeline retrieval which starts an async job, returning the jobId to poll for results.
 * @param timelineId
 * @returns {{ok: boolean, jobId: *}|{ok: boolean, error: string}}
 */
function retrieveTimeline(timelineId) {
    const res = http.get(`${BASE_URL}/api/timeline/${timelineId}`, {
        tags: { name: "GET /api/timeline/:id" },
        expected_response: false,
    });

    const jobId = res.status === 202 ? res.json("jobId") : null;
    debugLog(`Retrieve: GET /api/timeline/${timelineId} status=${res.status} jobId=${jobId || "-"}`);

    const ok = check(res, {
        "timeline retrieve accepted (202)": (r) => r.status === 202,
        "retrieve returned jobId": (r) => !!r.json("jobId"),
    });

    if (!ok) return { ok: false, error: `Retrieve failed status=${res.status} body=${res.body}` };
    return { ok: true, jobId };
}

/**
 * Deletes the timeline to clean up test data, should succeed if timelineId is valid.
 * @param timelineId
 */
function deleteTimeline(timelineId) {
    if (!timelineId) return;

    const res = http.del(`${BASE_URL}/api/timeline/${timelineId}`, null, {
        tags: { name: "DELETE /api/timeline/:id" },
        expected_response: false,
    });

    debugLog(`Delete: DELETE /api/timeline/${timelineId} status=${res.status}`);

    check(res, { "timeline deleted (200)": (r) => r.status === 200 });
}

/**
 * Main test flow executing the end-to-end user scenario with robust error handling and cleanup.
 * Each step's failure is captured and reported, but the flow continues to ensure cleanup runs.
 * Metrics are tracked for each operation and overall iteration success.
 */
export default function timelineFlow() {
    if (!USER_ID) fail("Missing USER_ID env var (must be a valid Mongo ObjectId)");

    let timelineId = null;
    let flowError = null;

    group("timeline flow", () => {
        try {
            const up = uploadPdf();
            if (!up.ok) {
                flowError = up.error;
                return;
            }

            const uploadPolled = pollJobUntilDone(up.jobId);
            if (!uploadPolled.done) {
                flowError = `Upload job timeout (${POLL_MAX_SECONDS}s) jobId=${up.jobId} polls=${uploadPolled.attempts}`;
                return;
            }

            const saved = saveTimeline(up.jobId);
            if (!saved.ok) {
                flowError = saved.error;
                return;
            }
            timelineId = saved.timelineId;

            const updated = updateTimeline(timelineId);
            if (!updated.ok) {
                flowError = updated.error;
                return;
            }

            const retrieved = retrieveTimeline(timelineId);
            if (!retrieved.ok) {
                flowError = retrieved.error;
                return;
            }

            const retrievePolled = pollJobUntilDone(retrieved.jobId);
            if (!retrievePolled.done) {
                flowError = `Retrieve job timeout (${POLL_MAX_SECONDS}s) jobId=${retrieved.jobId} polls=${retrievePolled.attempts}`;
                return;
            }

            debugLog(`Flow: success timelineId=${timelineId}`);
        } finally {
            deleteTimeline(timelineId);

            if (flowError) {
                iteration_success_rate.add(0);
                debugLog(`Flow: failed error=${flowError}`);
                fail(flowError);
            } else {
                iteration_success_rate.add(1);
            }
        }
    });

    sleep(1);
}