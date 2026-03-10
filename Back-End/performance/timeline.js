/// <reference path="./k6-globals.d.js" />
import http from "k6/http";
import {check} from "k6";
import {BASE_URL, debugLog, TIMELINE_NAME_PREFIX,} from "./config.js";
import {delete_failed_rate, timeline_save_failed_rate, timeline_update_failed_rate,} from "./metrics.js";

/**
 * Saves a new timeline for the given userId and uploadJobId.
 * @param {string} uploadJobId
 * @param {string} userId
 * @param {string} [timelineName] - defaults to TIMELINE_NAME_PREFIX-{VU}-{ITER} (only valid in VU context, not setup)
 * @returns {{ ok: boolean, timelineId?: string, error?: string }}
 */
export function saveTimeline(uploadJobId, userId, timelineName) {
    const timelineName_ = timelineName || `${TIMELINE_NAME_PREFIX}-${__VU}-${__ITER}`;

    const res = http.post(
        `${BASE_URL}/api/timeline`,
        JSON.stringify({ userId, timelineName: timelineName_, jobId: uploadJobId }),
        {
            headers: { "Content-Type": "application/json" },
            tags: { name: "POST /api/timeline" },
            expected_response: false,
        }
    );

    const timelineId = res.status === 201 ? res.json("_id") : null;
    debugLog(`Save: POST /api/timeline status=${res.status} timelineId=${timelineId || "-"} name=${timelineName_}`);

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
    delete_failed_rate.add(res.status === 200 ? 0 : 1);
    check(res, { "timeline deleted (200)": (r) => r.status === 200 });
}
