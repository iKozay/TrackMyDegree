/// <reference path="./k6-globals.d.js" />
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";
import { createTestUser, deleteTestUser } from "./users.js";
import { iteration_success_rate } from "./metrics.js";
import { saveTimeline, retrieveTimeline, deleteTimeline } from "./timeline.js";
import { pollJobUntilDone, uploadPdf } from "./common.js";
import { BASE_URL, getPdfForVU, debugLog } from "./config.js";

/**
 * Load scenario - ramping-vus executor.
 *
 * Models usage patterns with gradual ramp-up and ramp-down:
 *  - Ramp-up:     0 → peak VUs over 1 min  (traffic builds as students start their day)
 *  - Steady load: peak VUs held for 3 min  (sustained peak, measures stable-state performance)
 *  - Ramp-down:   peak → 0 over 1 min      (graceful wind-down, catches delayed failures)
 *
 *  Defaults are sized for local development. Override via env vars for CI/staging:
 *  - PEAK_VUS      — number of VUs at peak (default: 10)
 *  - RAMP_DURATION — how long each ramp stage takes (default: 1m)
 *  - STEADY_DURATION — how long to hold peak load (default: 3m)
 */

export const coop_validation_failed_rate = new Rate("coop_validation_failed_rate");

const PEAK_VUS        = Number(__ENV.PEAK_VUS        || "10");
const RAMP_DURATION   = __ENV.RAMP_DURATION           || "1m";
const STEADY_DURATION = __ENV.STEADY_DURATION         || "3m";

export const options = {
    systemTags: ["name", "status", "check", "group", "error"],
    scenarios: {
        coop_validation_load: {
            executor:         "ramping-vus",
            startVUs:         0,
            gracefulStop:     "30s",
            gracefulRampDown: "30s",
            stages: [
                // Ramp up — mirrors traffic building as users start their session
                { duration: RAMP_DURATION,   target: PEAK_VUS },
                // Steady load — sustained peak, this is what we measure
                { duration: STEADY_DURATION, target: PEAK_VUS },
                // Ramp down — catch any delayed failures or cleanup issues
                { duration: RAMP_DURATION,   target: 0        },
            ],
        },
    },
    thresholds: {
        iteration_success_rate:                               ["rate>0.95"],
        coop_validation_failed_rate:                          ["rate<0.01"],
        job_timeout_rate:                                     ["rate<0.05"],
        poll_network_error_rate:                              ["rate<0.05"],

        job_time_to_done_ms:                                  ["p(95)<8000"],
        "http_req_duration{name:GET /api/jobs/:jobId}":       ["p(95)<2000"],
        "http_req_duration{name:GET /api/timeline/:id}":      ["p(95)<2000"],
        "http_req_duration{name:GET /api/coop/validate/:id}": ["p(95)<500"],
    },
};

/**
 * Runs once before the test starts.
 * Creates one test user, uploads the coop transcript PDF, polls until processing
 * is done, then saves a single timeline shared by all VUs.
 * @returns {{ userId: string, timelineId: string }}
 */
export function setup() {
    const { userId } = createTestUser();

    // Always use the coop transcript (VU 1 → transcript-coop.pdf)
    const coopTranscriptPDF = getPdfForVU(1).file;

    // Upload PDF: POST /api/upload/file -> { jobId }
    const uploaded = uploadPdf(coopTranscriptPDF);
    if (!uploaded.ok) {
        throw new Error(`setup: upload failed — ${uploaded.error}`);
    }

    // Poll until the upload job is done so the timeline data is in cache
    const polled = pollJobUntilDone(uploaded.jobId);
    if (!polled.done) {
        throw new Error(`setup: upload job did not complete jobId=${uploaded.jobId} attempts=${polled.attempts}`);
    }

    // Save timeline referencing the upload job: POST /api/timeline -> { _id }
    const saved = saveTimeline(uploaded.jobId, userId, "k6-coop-validation-setup");
    if (!saved.ok) {
        throw new Error(`setup: save failed — ${saved.error}`);
    }

    console.log(`setup: timeline ready userId=${userId} timelineId=${saved.timelineId}`);
    return { userId, timelineId: saved.timelineId };
}

/** Runs once after all VUs finish. Deletes the shared timeline then the test user. */
export function teardown(data) {
    deleteTimeline(data.timelineId);
    deleteTestUser(data);
}

/**
 * Main VU loop — each VU runs this function in a loop for the duration of the test.
 * Flow: retrieve timeline → poll retrieval job → coop validate
 * @param {{ userId: string, timelineId: string }} data - passed from setup()
 */
export default function coopValidationFlow(data) {
    const { timelineId } = data;
    let flowError = null;

    group("coop validation flow", () => {
        try {
            // Step 1: Retrieve timeline to kick off an async retrieval job
            const retrieved = retrieveTimeline(timelineId);
            if (!retrieved.ok) { flowError = retrieved.error; return; }

            // Step 2: Poll until the retrieval job is done (result is in cache)
            const polled = pollJobUntilDone(retrieved.jobId);
            if (!polled.done) {
                flowError = `Retrieve job did not complete jobId=${retrieved.jobId} attempts=${polled.attempts} networkErrors=${polled.networkErrors}`;
                return;
            }

            // Step 3: Run coop validation against the cached job result
            const validated = coopValidation(retrieved.jobId);
            if (!validated.ok) { flowError = validated.error; return; }

            debugLog(`Coop validation: success timelineId=${timelineId} jobId=${retrieved.jobId}`);
        } finally {
            if (flowError) {
                iteration_success_rate.add(0);
                debugLog(`Coop validation flow: failed error=${flowError}`);
            } else {
                iteration_success_rate.add(1);
            }
        }
    });

    sleep(1);
}

/**
 * Calls GET /api/coop/validate/:jobId and checks for a successful 200 response.
 * @param {string} jobId
 * @returns {{ ok: boolean, result?: any, error?: string }}
 */
export function coopValidation(jobId) {
    const res = http.get(`${BASE_URL}/api/coop/validate/${jobId}`, {
        tags: { name: "GET /api/coop/validate/:id" },
        expected_response: false,
    });

    const ok = check(res, {
        "coop validation ok (200)": (r) => r.status === 200,
        "coop validation returned result": (r) => {
            try { return r.json() !== null; } catch { return false; }
        },
    });

    coop_validation_failed_rate.add(ok ? 0 : 1);
    debugLog(`Coop validate: GET /api/coop/validate/${jobId} status=${res.status}`);

    if (!ok) return { ok: false, error: `Coop validation failed status=${res.status} body=${res.body}` };
    return { ok: true, result: res.json() };
}
