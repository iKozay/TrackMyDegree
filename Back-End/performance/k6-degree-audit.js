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
 * Load scenario — ramping-vus executor.
 *
 * Models usage patterns with gradual ramp-up and ramp-down:
 *  - Ramp-up:     0 → peak VUs over 1 min  (traffic builds as students start their day)
 *  - Steady load: peak VUs held for 3 min  (sustained peak, measures stable-state performance)
 *  - Ramp-down:   peak → 0 over 1 min      (graceful wind-down, catches delayed failures)
 *
 *  Defaults are sized for local development. Override via env vars for CI/staging:
 *  - PEAK_VUS        — number of VUs at peak (default: 10)
 *  - RAMP_DURATION   — how long each ramp stage takes (default: 1m)
 *  - STEADY_DURATION — how long to hold peak load (default: 3m)
 *
 * All three degree audit routes are exercised every iteration to compare their
 * performance characteristics under the same load:
 *
 *   GET /api/audit/timeline/job/:jobId
 *   GET /api/audit/timeline/:timelineId
 *   GET /api/audit/user/:userId
 */

// One Rate metric per audit route so failures can be tracked independently
export const audit_by_job_failed_rate      = new Rate("audit_by_job_failed_rate");
export const audit_by_timeline_failed_rate = new Rate("audit_by_timeline_failed_rate");
export const audit_by_user_failed_rate     = new Rate("audit_by_user_failed_rate");

const PEAK_VUS        = Number(__ENV.PEAK_VUS        || "6");
const RAMP_DURATION   = __ENV.RAMP_DURATION           || "1m";
const STEADY_DURATION = __ENV.STEADY_DURATION         || "3m";

export const options = {
    systemTags: ["name", "status", "check", "group", "error"],
    scenarios: {
        degree_audit_load: {
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
        iteration_success_rate:       ["rate>0.95"],
        audit_by_job_failed_rate:     ["rate<0.01"],
        audit_by_timeline_failed_rate: ["rate<0.01"],
        audit_by_user_failed_rate:    ["rate<0.01"],
        job_timeout_rate:             ["rate<0.05"],
        poll_network_error_rate:      ["rate<0.05"],

        job_time_to_done_ms:                                               ["p(95)<3000"],
        "http_req_duration{name:GET /api/jobs/:jobId}":                    ["p(95)<2000"],
        "http_req_duration{name:GET /api/timeline/:id}":                   ["p(95)<200"],
        // Redis-only: no DB reads — expected to be fastest
        "http_req_duration{name:GET /api/audit/timeline/job/:jobId}":      ["p(95)<500"],
        // hits MongoDB (timeline + user + degree data)
        "http_req_duration{name:GET /api/audit/timeline/:timelineId}":     ["p(95)<1000"],
        // hits MongoDB (resolves latest timeline first, then same as above) — slowest
        "http_req_duration{name:GET /api/audit/user/:userId}":             ["p(95)<1500"],
    },
};

/**
 * Uploads a single PDF, polls until done, saves the resulting timeline, and returns
 * the timelineId. Throws if any step fails so setup() aborts early.
 * @param {{ bytes: ArrayBuffer, filename: string }} pdfFile
 * @param {string} userId
 * @param {string} label  — used in the saved timeline name for traceability
 * @returns {string} timelineId
 */
function setupTimeline(pdfFile, userId, label) {
    const uploaded = uploadPdf(pdfFile);
    if (!uploaded.ok) throw new Error(`setup(${label}): upload failed — ${uploaded.error}`);

    const polled = pollJobUntilDone(uploaded.jobId);
    if (!polled.done) throw new Error(`setup(${label}): upload job did not complete jobId=${uploaded.jobId} attempts=${polled.attempts}`);

    const saved = saveTimeline(uploaded.jobId, userId, `k6-degree-audit-${label}`);
    if (!saved.ok) throw new Error(`setup(${label}): save failed — ${saved.error}`);

    console.log(`setup(${label}): timeline ready timelineId=${saved.timelineId}`);
    return saved.timelineId;
}

/**
 * Runs once before the test starts.
 * Creates one test user, uploads all three transcript types, and saves a timeline
 * for each. All VUs share the same user and rotate across the three timelines.
 * @returns {{ userId: string, timelineIds: string[] }}
 */
export function setup() {
    const { userId } = createTestUser();

    // Upload and save a timeline for each transcript type
    const timelineIds = [
        setupTimeline(getPdfForVU(1).file, userId, "coop"),     // transcript-coop.pdf
        setupTimeline(getPdfForVU(2).file, userId, "ecp"),      // transcript-ecp.pdf
        setupTimeline(getPdfForVU(3).file, userId, "regular"),  // transcript-regular.pdf
    ];

    console.log(`setup: all timelines ready userId=${userId} timelineIds=${timelineIds.join(", ")}`);
    return { userId, timelineIds };
}

/** Runs once after all VUs finish. Deletes all three timelines then the test user. */
export function teardown(data) {
    for (const timelineId of data.timelineIds) {
        deleteTimeline(timelineId);
    }
    deleteTestUser(data);
}

/**
 * Main VU loop — exercises all three degree audit endpoints per iteration.
 *
 * Each VU is pinned to one transcript type for the full test duration via
 * round-robin over __VU — mirroring how k6-timeline.js assigns one PDF per VU:
 *   VU 1 → coop, VU 2 → ecp, VU 3 → regular, VU 4 → coop, …
 *
 * This means all three transcript types are stressed simultaneously under load.
 *
 * Note: auditByUser (step 5) always resolves the most recently updated timeline
 * for the shared userId — under concurrent load this will be whichever of the
 * three timelines was last touched, which is realistic behaviour for that endpoint.
 *
 * Flow per iteration:
 *   1. Retrieve assigned timeline  →  kicks off async retrieval job
 *   2. Poll until done             →  timeline data is now in Redis cache
 *   3. GET /api/audit/timeline/job/:jobId
 *   4. GET /api/audit/timeline/:timelineId
 *   5. GET /api/audit/user/:userId
 *
 * Steps 3–5 are called back-to-back with no early returns between them — a failure
 * in one does not prevent the others from running. All errors are collected.
 * The iteration is only marked successful if all five steps pass.
 *
 * @param {{ userId: string, timelineIds: string[] }} data - passed from setup()
 */
export default function degreeAuditFlow(data) {
    const { userId, timelineIds } = data;

    // Each VU is pinned to one timeline for the full test duration
    const timelineId = timelineIds[(__VU - 1) % timelineIds.length];

    let flowError = null;

    group("degree audit flow", () => {
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
            const errors = [];

            // Step 3: Audit via jobId
            const byJob = auditByJob(retrieved.jobId);
            if (!byJob.ok) errors.push(byJob.error);

            // Step 4: Audit via timelineId
            const byTimeline = auditByTimeline(timelineId, userId);
            if (!byTimeline.ok) errors.push(byTimeline.error);

            // Step 5: Audit via userId
            const byUser = auditByUser(userId);
            if (!byUser.ok) errors.push(byUser.error);

            if (errors.length > 0) flowError = errors.join(" | ");

            debugLog(`Degree audit: all routes done timelineId=${timelineId} jobId=${retrieved.jobId}`);
        } finally {
            if (flowError) {
                iteration_success_rate.add(0);
                debugLog(`Degree audit flow: failed error=${flowError}`);
            } else {
                iteration_success_rate.add(1);
            }
        }
    });

    sleep(1);
}

/**
 * GET /api/audit/timeline/job/:jobId
 * Reads from Redis cache — zero DB reads. Fastest path.
 * Fails with RESULT_EXPIRED if the Redis TTL has lapsed since polling completed.
 * @param {string} jobId
 * @returns {{ ok: boolean, result?: any, error?: string }}
 */
export function auditByJob(jobId) {
    const res = http.get(`${BASE_URL}/api/audit/timeline/job/${jobId}`, {
        tags: { name: "GET /api/audit/timeline/job/:jobId" },
        expected_response: false,
    });

    const ok = check(res, {
        "audit by jobId ok (200)":             (r) => r.status === 200,
        "audit by jobId returned result":      (r) => { try { return r.json() !== null; } catch { return false; } },
    });

    audit_by_job_failed_rate.add(ok ? 0 : 1);
    debugLog(`Audit by jobId: GET /api/audit/timeline/job/${jobId} status=${res.status}`);

    if (!ok) return { ok: false, error: `Audit by jobId failed status=${res.status} body=${res.body}` };
    return { ok: true, result: res.json() };
}

/**
 * GET /api/audit/timeline/:timelineId?userId=
 * Hits MongoDB to fetch the timeline, user, and degree data.
 * Ownership check (timeline.userId !== userId) is an in-memory comparison, not a DB call.
 * @param {string} timelineId
 * @param {string} userId
 * @returns {{ ok: boolean, result?: any, error?: string }}
 */
export function auditByTimeline(timelineId, userId) {
    const res = http.get(`${BASE_URL}/api/audit/timeline/${timelineId}?userId=${userId}`, {
        tags: { name: "GET /api/audit/timeline/:timelineId" },
        expected_response: false,
    });

    const ok = check(res, {
        "audit by timelineId ok (200)":        (r) => r.status === 200,
        "audit by timelineId returned result": (r) => { try { return r.json() !== null; } catch { return false; } },
    });

    audit_by_timeline_failed_rate.add(ok ? 0 : 1);
    debugLog(`Audit by timelineId: GET /api/audit/timeline/${timelineId} status=${res.status}`);

    if (!ok) return { ok: false, error: `Audit by timelineId failed status=${res.status} body=${res.body}` };
    return { ok: true, result: res.json() };
}

/**
 * GET /api/audit/user/:userId
 * Hits MongoDB to resolve the user's most recently updated timeline first,
 * then follows the same DB path as auditByTimeline.
 * @param {string} userId
 * @returns {{ ok: boolean, result?: any, error?: string }}
 */
export function auditByUser(userId) {
    const res = http.get(`${BASE_URL}/api/audit/user/${userId}`, {
        tags: { name: "GET /api/audit/user/:userId" },
        expected_response: false,
    });

    const ok = check(res, {
        "audit by userId ok (200)":            (r) => r.status === 200,
        "audit by userId returned result":     (r) => { try { return r.json() !== null; } catch { return false; } },
    });

    audit_by_user_failed_rate.add(ok ? 0 : 1);
    debugLog(`Audit by userId: GET /api/audit/user/${userId} status=${res.status}`);

    if (!ok) return { ok: false, error: `Audit by userId failed status=${res.status} body=${res.body}` };
    return { ok: true, result: res.json() };
}
