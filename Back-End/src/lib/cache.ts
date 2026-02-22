import { cacheRedisClient, jobRedisClient } from './redisClient';
import { RESULT_TTL_SECONDS } from '@utils/constants';

const resultKey = (jobId: string): string => `job:timeline:${jobId}`;

// Job result functions use db 1
export async function cacheJobResult(
  jobId: string,
  payload: unknown,
): Promise<void> {
  await jobRedisClient.setEx(
    resultKey(jobId),
    86400, // 24 hours TTL
    JSON.stringify(payload),
  );
}

interface CachedJobResult<T = unknown> {
  payload: {
    status: string;
    data: T;
  };
}

export async function getJobResult<T = unknown>(
  jobId: string,
): Promise<CachedJobResult<T> | null> {
  const raw = (await jobRedisClient.get(resultKey(jobId))) as string | null;
  if (!raw) return null;
  return JSON.parse(raw) as CachedJobResult<T>;
}

export async function deleteJobResult(jobId: string): Promise<void> {
  await jobRedisClient.del(resultKey(jobId));
}

export async function extendJobTTL(jobId: string): Promise<void> {
  await jobRedisClient.expire(resultKey(jobId), RESULT_TTL_SECONDS);
}

// API cache functions use db 0
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await cacheRedisClient.get(key);
  const str = toStringValue(raw);
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  await cacheRedisClient.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  await cacheRedisClient.del(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const keys = await cacheRedisClient.keys(pattern);
  if (keys.length > 0) {
    await cacheRedisClient.del(keys);
  }
}

function toStringValue(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Uint8Array) {
    return Buffer.from(raw).toString('utf8');
  }
  return String(raw);
}
