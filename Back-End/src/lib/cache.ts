// lib/cache.ts
import redisClient from './redisClient';
import { RESULT_TTL_SECONDS } from '@utils/constants';

const resultKey = (jobId: string): string => `job:timeline:${jobId}`;

export async function cacheJobResult(
  jobId: string,
  payload: unknown,
): Promise<void> {
  await redisClient.set(resultKey(jobId), JSON.stringify(payload));
}

export async function getJobResult<T = unknown>(
  jobId: string,
): Promise<T | null> {
  // TS thinks this might be string | Buffer, but you know it's always string
  const raw = (await redisClient.get(resultKey(jobId))) as unknown as
    | string
    | null;

  if (!raw) {
    return null; // expired / not found
  }

  return JSON.parse(raw) as T;
}

export async function deleteJobResult(jobId: string): Promise<void> {
  await redisClient.del(resultKey(jobId));
}

export async function extendJobTTL(jobId: string): Promise<void> {
  // reset / extend TTL for this job
  await redisClient.expire(resultKey(jobId), RESULT_TTL_SECONDS);
}
// Cache helpers
// -------------------------
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redisClient.get(key); // can be string | Buffer/Uint8Array | null

  const str = toStringValue(raw);
  if (!str) return null;

  try {
    return JSON.parse(str) as T;
  } catch {
    // If cache contains bad JSON, treat as a miss
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await redisClient.del(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

/** Convert Redis GET result to string safely */
function toStringValue(raw: unknown): string | null {
  if (raw == null) return null;

  if (typeof raw === "string") return raw;

  // Buffer (node) or Uint8Array
  if (raw instanceof Uint8Array) {
    return Buffer.from(raw).toString("utf8");
  }

  // Fallback (shouldn't usually happen, but keeps CI safe)
  return String(raw);
}
