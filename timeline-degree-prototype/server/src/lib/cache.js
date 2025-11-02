// lib/cache.js
import { redisClient } from "../config/redis.js";

// const RESULT_TTL_SECONDS = 60 * 60; // 1 hour
const resultKey = (jobId) => `job:result:${jobId}`;

export async function cacheJobResult(jobId, result) {


    await redisClient.set(resultKey(jobId), JSON.stringify(result));
}

export async function getJobResult(jobId) {
    const raw = await redisClient.get(resultKey(jobId));
    return raw ? JSON.parse(raw) : null; // null if expired/not found
}

export async function deleteJobResult(jobId) {
    await redisClient.del(resultKey(jobId));
}

export async function extendJobTTL(jobId) {
    await redisClient.expire(resultKey(jobId));
}
