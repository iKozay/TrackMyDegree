/// <reference path="./k6-globals.d.js" />
import http from "k6/http";
import { check, fail, sleep } from "k6";
import {
    BASE_URL,TIMELINE_NAME_PREFIX,
    POLL_MAX_SECONDS,
    POLL_INTERVAL_SECONDS,
    POLL_REQUEST_TIMEOUT,
    PDF_BYTES,
    debugLog,
} from "./config.js";
import {
    poll_200, poll_404, poll_410, poll_timeout,
    poll_network_error, poll_other,
    job_time_to_done_ms, polls_per_job,
    job_timeout_rate,
    timeline_save_failed_rate,
    timeline_update_failed_rate,
} from "./metrics.js";

/**
 * Polls GET /api/jobs/:jobId until status=done, timeout, or unexpected failure.
 * @param {string} jobId
 * @returns {{ done: boolean, result: any, attempts: number, elapsed: number }}
 */
export function pollJobUntilDone(jobId) {
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
            debugLog(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=0 error=${r.error || "unknown"}`);
            sleep(POLL_INTERVAL_SECONDS);
            continue;
        }

        if (r.status === 200) {
            poll_200.add(1);
            const body = r.json();
            const jobStatus = body && body.status;
            debugLog(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=200 jobStatus=${jobStatus}`);

            if (jobStatus === "done") {
                const elapsed = Date.now() - started;
                job_time_to_done_ms.add(elapsed);
                polls_per_job.add(attempts);
                job_timeout_rate.add(0);
                return { done: true, result: body.result, attempts, elapsed };
            }} else if (r.status === 410) {
            poll_410.add(1);
            debugLog(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=410`);
        } else if (r.status === 404) {
            poll_404.add(1);
            debugLog(`Poll attempt ${attempts}: GET /api/jobs/${jobId} status=404`);
        } else {
            poll_other.add(1);
            fail(`Poll: unexpected status=${r.status} GET /api/jobs/${jobId} body=${r.body}`);
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
 * Uploads the PDF and returns the jobId for processing.
 * @returns {{ ok: boolean, jobId?: string, error?: string }}
 */
export function uploadPdf() {
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
 * Saves a new timeline for the given userId and uploadJobId.
 * @param {string} uploadJobId
 * @param {string} userId
 * @returns {{ ok: boolean, timelineId?: string, error?: string }}
 */
export function saveTimeline(uploadJobId, userId) {
    const timelineName = `${TIMELINE_NAME_PREFIX}-${__VU}-${__ITER}`;

    const res = http.post(
        `${BASE_URL}/api/timeline`,
        JSON.stringify({ userId, timelineName, jobId: uploadJobId }),
        {
            headers: { "Content-Type": "application/json" },
            tags: { name: "POST /api/timeline" },
            expected_response: false,
        }
    );

    const timelineId = res.status === 201 ? res.json("_id") : null;
    debugLog(`Save: POST /api/timeline status=${res.status} timelineId=${timelineId || "-"} name=${timelineName}`);

    timeline_save_failed_rate.add(res.status === 201 ? 0 : 1);

    const ok = check(res, {
        "timeline saved (201)": (r) => r.status === 201,
        "save returned _id": (r) => !!r.json("_id"),
    });

    if (!ok) return { ok: false, error: `Save failed status=${res.status} body=${res.body}` };
    return { ok: true, timelineId };
}

/**
 * Updates the timeline name via PUT /api/timeline/:id.
 * @param {string} timelineId
 * @returns {{ ok: boolean, error?: string }}
 */
export function updateTimeline(timelineId) {
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
 * Triggers async timeline retrieval, returns jobId to poll.
 * @param {string} timelineId
 * @returns {{ ok: boolean, jobId?: string, error?: string }}
 */
export function retrieveTimeline(timelineId) {
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
 * Deletes the timeline. Always runs for cleanup even if earlier steps failed.
 * @param {string|null} timelineId
 */
export function deleteTimeline(timelineId) {
    if (!timelineId) return;

    const res = http.del(`${BASE_URL}/api/timeline/${timelineId}`, null, {
        tags: { name: "DELETE /api/timeline/:id" },
        expected_response: false,
    });

    debugLog(`Delete: DELETE /api/timeline/${timelineId} status=${res.status}`);
    check(res, { "timeline deleted (200)": (r) => r.status === 200 });
}
