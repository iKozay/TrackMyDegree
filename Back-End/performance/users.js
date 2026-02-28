/// <reference path="./k6-globals.d.js" />
import http from "k6/http";
import { check, fail } from "k6";
import { BASE_URL } from "./config.js";

/**
 * Creates a k6 test user via POST /api/users.
 * Called once in setup() before any VU starts.
 * @returns {{ userId: string }}
 */
export function createTestUser() {
    const res = http.post(
        `${BASE_URL}/api/users`,
        JSON.stringify({
            email: `k6-test-${Date.now()}@perf.local`,
            fullname: "k6 Test User",
            type: "student",
        }),
        {
            headers: { "Content-Type": "application/json" },
            tags: { name: "POST /api/users (setup)" },
        }
    );

    const ok = check(res, {
        "setup: user created (201)": (r) => r.status === 201,
        "setup: response has user object": (r) => {
            const b = r.json();
            return !!(b && (b._id || (b.user && b.user._id)));
        },
    });

    if (!ok) {
        fail(`setup: user creation failed status=${res.status} body=${res.body}`);
    }

    // POST /api/users returns { message, user: { _id, ... } } per userRoutes.ts
    const body = res.json();
    const userId = (body.user && body.user._id) || body._id;

    console.log(`setup: test user created userId=${userId}`);
    return { userId };
}

/**
 * Deletes the k6 test user via DELETE /api/users/:id.
 * Called once in teardown() after all VUs finish.
 * @param {{ userId: string }} data
 */
export function deleteTestUser(data) {
    if (!data || !data.userId) return;

    const res = http.del(`${BASE_URL}/api/users/${data.userId}`, null, {
        tags: { name: "DELETE /api/users (teardown)" },
    });

    check(res, { "teardown: user deleted (200)": (r) => r.status === 200 });
    console.log(`teardown: user deleted userId=${data.userId} status=${res.status}`);
}
