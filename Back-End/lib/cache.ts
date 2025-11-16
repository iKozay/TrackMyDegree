// lib/cache.ts
import  redisClient  from "./redisClient";

const RESULT_TTL_SECONDS = 60 * 60; // 1 hour

const resultKey = (jobId: string): string => `job:timeline:${jobId}`;

export async function cacheJobResult(
  jobId: string,
  payload: unknown
): Promise<void> {
  await redisClient.set(resultKey(jobId), JSON.stringify(payload));
}

export async function getJobResult<T = unknown>(
  jobId: string
): Promise<T | null> {
  const raw = await redisClient.get(resultKey(jobId));
  return raw ? (JSON.parse(raw) as T) : null; // null if expired/not found
}

export async function deleteJobResult(jobId: string): Promise<void> {
  await redisClient.del(resultKey(jobId));
}

export async function extendJobTTL(jobId: string): Promise<void> {
  // reset / extend TTL for this job
  await redisClient.expire(resultKey(jobId), RESULT_TTL_SECONDS);
}
