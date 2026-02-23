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
import { createTestUser } from "./users.js";
import { deleteTestUser } from "./users.js";
import {
    uploadPdf,
    pollJobUntilDone,
    saveTimeline,
    updateTimeline,
    retrieveTimeline,
    deleteTimeline,
} from "./timeline.js";
import { iteration_success_rate } from "./metrics.js";
import { debugLog } from "./config.js";

export const options = {
    vus: Number(__ENV.VUS || "1"),
    duration: __ENV.DURATION || "10s",
    thresholds: {
        iteration_success_rate:          ["rate>0.95"],
        job_timeout_rate:                ["rate<0.05"],
        timeline_save_failed_rate:       ["rate<0.01"],
        timeline_update_failed_rate:     ["rate<0.01"],

        job_time_to_done_ms:                              ["p(95)<3000"],
        "http_req_duration{name:POST /api/upload/file}": ["p(95)<500"],
        "http_req_duration{name:GET /api/jobs/:jobId}":  ["p(95)<2000"],
        "http_req_duration{name:POST /api/timeline}":    ["p(95)<200"],
        "http_req_duration{name:PUT /api/timeline/:id}": ["p(95)<200"],
        "http_req_duration{name:GET /api/timeline/:id}": ["p(95)<200"],
        "http_req_duration{name:DELETE /api/timeline/:id}": ["p(95)<200"],
    },
};

/** Runs once before VUs start. Creates one shared test user. */
export function setup() {
    return createTestUser();
}

/** Runs once after all VUs finish. Deletes the shared test user. */
export function teardown(data) {
    deleteTestUser(data);
}

/**
 * Main VU loop. Executes the full timeline CRUD flow each iteration.
 * @param {{ userId: string }} data - passed from setup()
 */
export default function timelineFlow(data) {
    const { userId } = data;
    let timelineId = null;
    let flowError = null;

    group("timeline flow", () => {
        try {
            const up = uploadPdf();
            if (!up.ok) { flowError = up.error; return; }

            const uploadPolled = pollJobUntilDone(up.jobId);
            if (!uploadPolled.done) {
                flowError = `Upload job timed out jobId=${up.jobId} attempts=${uploadPolled.attempts}`;
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
                flowError = `Retrieve job timed out jobId=${retrieved.jobId} attempts=${retrievePolled.attempts}`;
                return;
            }

            debugLog(`Flow: success timelineId=${timelineId}`);
        } finally {
            deleteTimeline(timelineId);

            if (flowError) {
                iteration_success_rate.add(0);
                debugLog(`Flow: failed error=${flowError}`);
            } else {
                iteration_success_rate.add(1);
            }
        }
    });

    sleep(1);
}