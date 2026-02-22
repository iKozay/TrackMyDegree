/**
 * k6 performance test (k6-timeline.js)
 *
 * What it tests (end-to-end user flow):
 * 1) Upload a PDF transcript: POST /api/upload/file  -> returns { jobId }
 * 2) Poll job completion:     GET  /api/jobs/:jobId  -> 200 { status:"done", result }
 * 3) Save timeline:           POST /api/timeline     -> 201 with timeline { _id }
 * 4) Retrieve timeline:       GET  /api/timeline/:id -> 202 { jobId } (async retrieval)
 * 5) Poll retrieval job:      GET  /api/jobs/:jobId  -> 200 { status:"done", result }
 * 6) Delete timeline:         DELETE /api/timeline/:id -> 200 (cleanup test data)
 *
 * Goal: meaningful metrics for async pipelines:
 * - Tests full CRUD: Create (save) + Read (retrieve) + Delete (cleanup)
 * - Verifies data persisted correctly and can be fetched
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
        // Business-level success metrics (what actually matters)
        iteration_success_rate: ["rate>0.95"],  // 95%+ of full flows must complete
        job_timeout_rate: ["rate<0.05"],         // <5% of jobs can timeout
        timeline_save_failed_rate: ["rate<0.01"], // <1% of saves can fail (any non-201)

        // Performance SLOs (breakdown by endpoint)
        "job_time_to_done_ms": ["p(95)<3000"],   // 95% of jobs finish within 3s
        "http_req_duration{name:POST /api/upload/file}": ["p(95)<500"],
        "http_req_duration{name:POST /api/timeline}": ["p(95)<200"],
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
// Custom metrics (meaningful)
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

        // k6: status===0 => no HTTP response (timeout / connect error)
        if (r.status === 0) {
            const err = (r.error || "").toLowerCase();

            if (err.includes("timeout")) poll_timeout.add(1);
            else poll_network_error.add(1);

            console.log(
                `Poll attempt ${attempts}: GET /api/jobs/${jobId} status=0 error=${r.error || "unknown"}`
            );

            sleep(POLL_INTERVAL_SECONDS);
            continue;
        }

        if (r.status === 200) {
            poll_200.add(1);
            const body = r.json();
            const status = body && body.status;

            console.log(
                `Poll attempt ${attempts}: GET /api/jobs/${jobId} status=200, jobStatus=${status}`
            );

            if (status === "done") {
                const elapsed = Date.now() - started;
                job_time_to_done_ms.add(elapsed);
                polls_per_job.add(attempts);
                return { done: true, result: body.result, attempts, elapsed };
            }
        } else if (r.status === 410) {
            poll_410.add(1);
            console.log(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=410`);
        } else if (r.status === 404) {
            poll_404.add(1);
            console.log(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=404`);
        } else {
            poll_other.add(1);
            fail(`Unexpected poll status=${r.status} GET /api/jobs/${jobId} body=${r.body}`);
        }

        sleep(POLL_INTERVAL_SECONDS);
    }

    polls_per_job.add(attempts);
    job_timeout_rate.add(1);
    return { done: false, result: null, attempts, elapsed: Date.now() - started };
}

export default function timelineFlow() {
    if (!USER_ID) fail("Missing USER_ID env var (must be a valid Mongo ObjectId)");

    let timelineId = null;  // Track for cleanup
    let flowError = null;   // Track errors without aborting immediately

    group("upload -> poll -> save -> retrieve -> delete timeline", () => {
        try {
            // 1) Upload
            const uploadRes = http.post(
                `${BASE_URL}/api/upload/file`,
                { file: http.file(PDF_BYTES, "Student_Record.pdf", "application/pdf") },
                { tags: { name: "POST /api/upload/file" } }
            );

            const uploadOk = check(uploadRes, {
                "upload accepted (200)": (r) => r.status === 200,
                "upload returned jobId": (r) => !!r.json("jobId"),
            });

            if (!uploadOk) {
                flowError = `Upload failed: status=${uploadRes.status}`;
                return; // Can't proceed without jobId
            }

            const uploadJobId = uploadRes.json("jobId");
            if (!uploadJobId) {
                flowError = "Missing jobId from upload response";
                return;
            }

            console.log(`POST /api/upload/file -> status=${uploadRes.status}, jobId=${uploadJobId}`);

            // 2) Poll upload job
            const uploadPolled = pollJobUntilDone(uploadJobId);
            if (!uploadPolled.done) {
                flowError = `Upload job timeout (${POLL_MAX_SECONDS}s). jobId=${uploadJobId} polls=${uploadPolled.attempts}`;
                return; // Can't proceed without job result
            }

            // 3) Save timeline
            const saveRes = http.post(
                `${BASE_URL}/api/timeline`,
                JSON.stringify({
                    userId: USER_ID,
                    timelineName: `${TIMELINE_NAME_PREFIX}-${__VU}-${__ITER}`,
                    jobId: uploadJobId,
                }),
                {
                    headers: { "Content-Type": "application/json" },
                    tags: { name: "POST /api/timeline" },
                }
            );

            timeline_save_failed_rate.add(saveRes.status !== 201 ? 1 : 0);

            const saveOk = check(saveRes, {
                "timeline saved (201)": (r) => r.status === 201,
            });

            if (!saveOk) {
                flowError = `Save timeline failed: status=${saveRes.status}`;
                return; // No timeline to clean up
            }

            const saveBody = saveRes.json();
            timelineId = saveBody._id;

            if (!timelineId) {
                flowError = "Missing _id from save response";
                return;
            }

            console.log(`POST /api/timeline -> status=${saveRes.status}, timelineId=${timelineId}`);

            // 4) Retrieve timeline (triggers async job)
            const getRes = http.get(`${BASE_URL}/api/timeline/${timelineId}`, {
                tags: { name: "GET /api/timeline/:id" },
            });

            const retrieveOk = check(getRes, {
                "timeline retrieve accepted (202)": (r) => r.status === 202,
                "retrieve returned jobId": (r) => !!r.json("jobId"),
            });

            if (!retrieveOk) {
                flowError = `Retrieve timeline failed: status=${getRes.status}`;
                // Continue to cleanup even if retrieve fails
            } else {
                const retrieveJobId = getRes.json("jobId");
                if (!retrieveJobId) {
                    flowError = "Missing jobId from retrieve response";
                } else {
                    console.log(`GET /api/timeline/${timelineId} -> status=${getRes.status}, jobId=${retrieveJobId}`);

                    // 5) Poll retrieve job
                    const retrievePolled = pollJobUntilDone(retrieveJobId);
                    if (!retrievePolled.done) {
                        flowError = `Retrieve job timeout (${POLL_MAX_SECONDS}s). jobId=${retrieveJobId} polls=${retrievePolled.attempts}`;
                        // Continue to cleanup
                    }
                }
            }
        } finally {
            // 6) ALWAYS attempt cleanup if we have a timelineId
            if (timelineId) {
                const deleteRes = http.del(`${BASE_URL}/api/timeline/${timelineId}`, null, {
                    tags: { name: "DELETE /api/timeline/:id" },
                });

                check(deleteRes, {
                    "timeline deleted (200)": (r) => r.status === 200,
                });

                console.log(`DELETE /api/timeline/${timelineId} -> status=${deleteRes.status}`);

                if (deleteRes.status !== 200) {
                    console.error(`WARN: Failed to delete timeline ${timelineId}, status=${deleteRes.status}`);
                }
            }

            // Report metrics and fail AFTER cleanup
            if (flowError) {
                iteration_success_rate.add(0);
                fail(flowError);
            } else {
                iteration_success_rate.add(1);
            }
        }
    });
}

