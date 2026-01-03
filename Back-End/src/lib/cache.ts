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

interface CachedJobResult<T = unknown> {
  payload: {
    status: string;
    data: T;
  };
}
export async function getJobResult<T = unknown>(
  jobId: string,
): Promise<CachedJobResult<T> | null> {
  // TS thinks this might be string | Buffer, but you know it's always string
  const raw = (await redisClient.get(resultKey(jobId))) as unknown as
    | string
    | null;

  if (!raw) {
    return null; // expired / not found
  }

  return JSON.parse(raw) as CachedJobResult<T>;
}

export async function deleteJobResult(jobId: string): Promise<void> {
  await redisClient.del(resultKey(jobId));
}

export async function extendJobTTL(jobId: string): Promise<void> {
  // reset / extend TTL for this job
  await redisClient.expire(resultKey(jobId), RESULT_TTL_SECONDS);
}
