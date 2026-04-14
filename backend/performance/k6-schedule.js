/// <reference path="./k6-globals.d.js" />
import http from "k6/http";
import { check, group, sleep } from "k6";
import {
    schedule_iteration_success_rate,
    schedule_failed_rate,
    schedule_http_failed_rate,
} from "./metrics.js";
import { BASE_URL, debugLog } from "./config.js";

/**
 * k6 performance test (k6-schedule.js)
 *
 * Flow per iteration:
 * 1) GET /api/section/schedule?subject=&catalog=
 *
 * Checks per response:
 *   - HTTP 200
 *
 * Load scenario — ramping-vus executor:
 *   - Ramp-up:     0 → peak VUs over RAMP_DURATION   (default 1m)
 *   - Steady load: peak VUs held for STEADY_DURATION  (default 3m)
 *   - Ramp-down:   peak → 0 over RAMP_DURATION        (default 1m)
 *
 * Override via env vars:
 *   PEAK_VUS        — concurrent VUs at peak  (default 10)
 *   RAMP_DURATION   — ramp stage length        (default 1m)
 *   STEADY_DURATION — steady stage length      (default 3m)
 *   SCHEDULE_PAIRS  — comma-separated subject:catalog pairs
 *                     e.g. "COMP:248,SOEN:490,COMP:346"
 */

// ── Load parameters ──────────────────────────────────────────────────────────
const PEAK_VUS        = Number(__ENV.PEAK_VUS        || "10");
const RAMP_DURATION   = __ENV.RAMP_DURATION           || "1m";
const STEADY_DURATION = __ENV.STEADY_DURATION         || "3m";


// ── Fixture pairs ────────────────────────────────────────────────────────────
const DEFAULT_PAIRS = [
    { subject: "COMP", catalog: "248" },  // OBJ-ORIENTED PROGRAMMING I — high enrolment, every term
    { subject: "COMP", catalog: "346" },  // Data Structures & Algorithms    — high enrolment, every term
    { subject: "COEN", catalog: "212" },  // Digital Systems Design I        — every term
    { subject: "SOEN", catalog: "287" },  // Web Programming                 — every term
    { subject: "ENGR", catalog: "201" },  // Engineering and Society         — every term, cross-faculty
    { subject: "COMP", catalog: "472" },  // Artificial Intelligence         — every term, upper year
];

function parsePairs(input) {
    if (!input) return DEFAULT_PAIRS;
    const pairs = input
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [subject, catalog] = entry.split(":").map((s) => s.trim());
            if (!subject || !catalog) return null;
            return { subject: subject.toUpperCase(), catalog };
        })
        .filter(Boolean);

    return pairs.length > 0 ? pairs : DEFAULT_PAIRS;
}

const SCHEDULE_PAIRS = parsePairs(__ENV.SCHEDULE_PAIRS);

export const options = {
    systemTags: ["name", "status", "check", "group", "error"],
    scenarios: {
        schedule_load: {
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
        // Overall iteration health for this flow
        schedule_iteration_success_rate: ["rate>0.95"],

        // Aggregate failure for this flow (status check only)
        schedule_failed_rate: ["rate<0.01"],

        // HTTP status failures (non-200)
        schedule_http_failed_rate: ["rate<0.01"],

        // Built-in: connection refused, DNS failure, or request timeout — no HTTP response at all
        http_req_failed: ["rate<0.01"],

        // Latency — p(95) for typical load, p(99) to catch tail latency
        // Baseline at 100 VUs: p(95)≈5.81s, p(99)≈6.31s, max≈6.72s
        // Thresholds set well above baseline to catch genuine regressions without false positives
        "http_req_duration{name:GET /api/section/schedule}": ["p(95)<8000", "p(99)<9000"],
    },
};

/**
 * Returns a readable preview of a response body, capped at maxLen characters.
 * Avoids nested ternaries and keeps debug log lines manageable.
 * @param {string|null} body
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(body, maxLen) {
    if (!body) return "(empty)";
    if (body.length <= maxLen) return body;
    return body.slice(0, maxLen) + "…";
}

export default function scheduleFlow() {
    // Spread VUs across pairs using a prime-offset so consecutive VUs and
    // consecutive iterations never land on the same course together.
    const pairIdx = ((__VU - 1) * 3 + __ITER) % SCHEDULE_PAIRS.length;
    const { subject, catalog } = SCHEDULE_PAIRS[pairIdx];
    let flowError = null;

    group("course schedule", () => {
        const url = `${BASE_URL}/api/section/schedule?subject=${encodeURIComponent(subject)}&catalog=${encodeURIComponent(catalog)}`;

        debugLog(`[VU=${__VU} ITER=${__ITER}] → GET ${url}`);

        const res = http.get(
            url,
            { tags: { name: "GET /api/section/schedule" } }
        );

        const preview = truncate(res.body, 300);
        debugLog(`[VU=${__VU} ITER=${__ITER}] ← ${res.status} (${res.timings.duration.toFixed(1)}ms) body=${preview}`);

        const httpOk = check(res, {
            "schedule status is 200": (r) => r.status === 200,
        });
        schedule_http_failed_rate.add(httpOk ? 0 : 1);

        if (!httpOk) {
            flowError = `HTTP ${res.status} for subject=${subject} catalog=${catalog} body=${truncate(res.body, 300)}`;
            debugLog(flowError);
            schedule_failed_rate.add(1);
            schedule_iteration_success_rate.add(0);
            return;
        }

        // All checks passed
        schedule_failed_rate.add(0);
        schedule_iteration_success_rate.add(1);
    });


    sleep(1);
}
