/// <reference path="./k6-globals.d.js" />
import http from "k6/http";
import { check, fail, sleep } from "k6";
import {BASE_URL, debugLog, POLL_INTERVAL_SECONDS, POLL_MAX_SECONDS, POLL_REQUEST_TIMEOUT} from "./config.js";
import {
    job_time_to_done_ms,
    job_timeout_rate,
    poll_200,
    poll_404,
    poll_410,
    poll_network_error,
    poll_network_error_rate,
    poll_other,
    poll_timeout,
    polls_per_job,
    upload_failed_rate
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
    let networkErrors = 0;

    while (Date.now() < deadline) {
        attempts++;

        const r = http.get(`${BASE_URL}/api/jobs/${jobId}`, {
            tags: {name: "GET /api/jobs/:jobId"},
            expected_response: false,
            timeout: POLL_REQUEST_TIMEOUT,
        });

        if (r.status === 0) {
            networkErrors++;
            poll_network_error.add(1);
            poll_network_error_rate.add(1);
            // status=0 means no HTTP response was received — this is a network-level
            // failure (timeout, connection refused, DNS error), not an HTTP error code.
            // r.error contains the reason (e.g. "request timeout", "connection refused").
            const errorType = (r.error || "unknown").includes("timeout") ? "request_timeout" : "network_error";
            console.warn(`[poll status=0] attempt=${attempts} jobId=${jobId} reason=${errorType} detail="${r.error || "unknown"}"`);
            sleep(POLL_INTERVAL_SECONDS);
            continue;
        }

        // request got a response — record as non-error for the rate
        poll_network_error_rate.add(0);

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
                return {done: true, result: body.result, attempts, networkErrors, elapsed};
            }
        } else if (r.status === 410) {
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
    debugLog(`Poll timeout: GET /api/jobs/${jobId} attempts=${attempts} networkErrors=${networkErrors} elapsedMs=${Date.now() - started}`);
    return {done: false, result: null, attempts, networkErrors, elapsed: Date.now() - started};
}

/**
 * Uploads the given PDF and returns the jobId for processing.
 * @param {{ bytes: ArrayBuffer, filename: string }} pdfFile
 * @returns {{ ok: boolean, jobId?: string, error?: string }}
 */
export function uploadPdf(pdfFile) {
    const res = http.post(
        `${BASE_URL}/api/upload/file`,
        {file: http.file(pdfFile.bytes, pdfFile.filename, "application/pdf")},
        {tags: {name: "POST /api/upload/file"}, expected_response: false}
    );

    const jobId = res.status === 200 ? res.json("jobId") : null;
    debugLog(`Upload: POST /api/upload/file file=${pdfFile.filename} status=${res.status} jobId=${jobId || "-"}`);

    upload_failed_rate.add(res.status === 200 ? 0 : 1);

    const ok = check(res, {
        "upload accepted (200)": (r) => r.status === 200,
        "upload returned jobId": (r) => !!r.json("jobId"),
    });

    if (!ok) return {ok: false, error: `Upload failed status=${res.status} body=${res.body}`};
    return {ok: true, jobId};
}