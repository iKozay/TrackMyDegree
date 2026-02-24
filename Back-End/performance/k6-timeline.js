/**
 * k6 performance test (k6-timeline.js)
 *
 * End-to-end user flow per iteration:
 * 1) [setup]   Create test user:      POST /api/users           -> { user: { _id } }
 * 2)           Upload PDF:            POST /api/upload/file     -> { jobId }
 * 3)           Poll upload job:       GET  /api/jobs/:jobId     -> { status:"done" }
 * 4)           Save timeline:         POST /api/timeline        -> { _id }
 * 5)           Update timeline:       PUT  /api/timeline/:id   -> 200
 * 6)           Retrieve timeline:     GET  /api/timeline/:id   -> { jobId }
 * 7)           Poll retrieval job:    GET  /api/jobs/:jobId     -> { status:"done" }
 * 8)           Delete timeline:       DELETE /api/timeline/:id -> 200
 * 9) [teardown] Delete test user:     DELETE /api/users/:id    -> 200
 */
/// <reference path="./k6-globals.d.js" />
import { group, sleep } from "k6";
import { createTestUser, deleteTestUser } from "./users.js";
import {
    uploadPdf,
    pollJobUntilDone,
    saveTimeline,
    updateTimeline,
    retrieveTimeline,
    deleteTimeline,
} from "./timeline.js";
import { iteration_success_rate } from "./metrics.js";
import { getPdfForVU, debugLog } from "./config.js";

// Resolved once per VU at init time — never changes across iterations
const { docType, file: pdfFile } = getPdfForVU(__VU);

/**
 * Load scenario — ramping-vus executor.
 *
 * Models usage patterns with gradual ramp-up and ramp-down:
 *   - Ramp-up:     0 → peak VUs over 1 min  (traffic builds as students start their day)
 *   - Steady load: peak VUs held for 3 min  (sustained peak, measures stable-state performance)
 *   - Ramp-down:   peak → 0 over 1 min      (graceful wind-down, catches delayed failures)
 *
 * Defaults are sized for local development. Override via env vars for CI/staging:
 *   PEAK_VUS      — number of VUs at peak (default: 6, one per PDF file)
 *   RAMP_DURATION — how long each ramp stage takes (default: 1m)
 *   STEADY_DURATION — how long to hold peak load (default: 3m)
 *
 * Using 6 VUs by default ensures all 6 PDF files are exercised evenly
 * (one VU per file via the deterministic getPdfForVU rotation).
 * Use a multiple of 6 to keep coverage even at higher loads.
 */
const PEAK_VUS       = Number(__ENV.PEAK_VUS       || "6");
const RAMP_DURATION  = __ENV.RAMP_DURATION          || "1m";
const STEADY_DURATION = __ENV.STEADY_DURATION       || "3m";

export const options = {
    scenarios: {
        timeline_load: {
            executor:        "ramping-vus",
            startVUs:        0,
            gracefulStop:    "30s",
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
        iteration_success_rate:          ["rate>0.95"],
        job_timeout_rate:                ["rate<0.05"],
        poll_network_error_rate:         ["rate<0.05"],
        upload_failed_rate:              ["rate<0.01"],
        delete_failed_rate:              ["rate<0.01"],
        timeline_save_failed_rate:       ["rate<0.01"],
        timeline_update_failed_rate:     ["rate<0.01"],

        job_time_to_done_ms:                                ["p(95)<3000"],
        "http_req_duration{name:POST /api/upload/file}":    ["p(95)<500"],
        "http_req_duration{name:GET /api/jobs/:jobId}":     ["p(95)<2000"],
        "http_req_duration{name:POST /api/timeline}":       ["p(95)<200"],
        "http_req_duration{name:PUT /api/timeline/:id}":    ["p(95)<200"],
        "http_req_duration{name:GET /api/timeline/:id}":    ["p(95)<200"],
        "http_req_duration{name:DELETE /api/timeline/:id}": ["p(95)<200"],
    },
};

/**
 * Runs once before the test starts and creates a single test user.
 * That same userId is shared by all VUs.
 *
 * This is intentional — the userId is only stored on the timeline as a reference.
 * Each VU creates its own timeline with a unique name
 * (TIMELINE_NAME_PREFIX-{VU}-{ITER}), so they don’t conflict with each other.
 *
 * Using one user keeps setup/cleanup simple and avoids filling the database
 * with lots of temporary test accounts.
 */
export function setup() {
    return createTestUser();
}

/** Runs once after all VUs finish. Deletes the shared test user. */
export function teardown(data) {
    deleteTestUser(data);
}

/**
 * Main VU loop. Executes the full timeline CRUD flow each iteration.
 * Each step must succeed for the flow to be considered successful.
 * Steps are: upload PDF, poll upload job, save timeline, update timeline, retrieve timeline, poll retrieval job, delete timeline.
 * Failures are tracked via the iteration_success_rate metric and logged for debugging.
 * @param {{ userId: string }} data - passed from setup()
 */
export default function timelineFlow(data) {
    const { userId } = data;
    let timelineId = null;
    let flowError = null;

    group("timeline flow", () => {
        try {
            // Step 1: Upload PDF
            const up = uploadPdf(pdfFile);
            if (!up.ok) { flowError = up.error; return; }

            const uploadPolled = pollJobUntilDone(up.jobId);
            if (!uploadPolled.done) {
                flowError = `Upload job did not complete jobId=${up.jobId} attempts=${uploadPolled.attempts} networkErrors=${uploadPolled.networkErrors}`;
                return;
            }
            if (uploadPolled.networkErrors > 0) {
                flowError = `Upload job completed but had ${uploadPolled.networkErrors} network error(s) jobId=${up.jobId}`;
                return;
            }

            const saved = saveTimeline(up.jobId, userId);
            if (!saved.ok) { flowError = saved.error; return; }
            timelineId = saved.timelineId;

            const updated = updateTimeline(timelineId);
            if (!updated.ok) { flowError = updated.error; return; }

            const retrieved = retrieveTimeline(timelineId);
            if (!retrieved.ok) { flowError = retrieved.error; return; }

            const retrievePolled = pollJobUntilDone(retrieved.jobId);
            if (!retrievePolled.done) {
                flowError = `Retrieve job did not complete jobId=${retrieved.jobId} attempts=${retrievePolled.attempts} networkErrors=${retrievePolled.networkErrors}`;
                return;
            }
            if (retrievePolled.networkErrors > 0) {
                flowError = `Retrieve job completed but had ${retrievePolled.networkErrors} network error(s) jobId=${retrieved.jobId}`;
                return;
            }

            debugLog(`Flow: success timelineId=${timelineId}`);
        } finally {
            deleteTimeline(timelineId);

            if (flowError) {
                iteration_success_rate.add(0);
                debugLog(`Flow [${docType}:${pdfFile.filename}]: failed error=${flowError}`);
            } else {
                iteration_success_rate.add(1);
            }
        }
    });

    sleep(1);
}