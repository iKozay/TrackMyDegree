// Redis client setup for caching or quick key-value storage.
// Uses environment variable REDIS_URL or defaults to local Redis instance.
/**
 * Purpose:
 *  - Sets up a Redis client for caching or quick key-value storage.
 * Notes:
 *  - Uses REDIS_URL from environment variables or defaults to 'redis://redis:6379'.
 *  - Logs errors to Sentry and console.
 *  - Connects automatically on import and exports the client for use in other modules.
 */
import { createClient } from 'redis';
import Sentry from '@sentry/node';

// API cache (db 0)
const cacheRedisUrl = process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0';
export const cacheRedisClient = createClient({ url: cacheRedisUrl });

cacheRedisClient.on('error', (err) => {
  Sentry.captureException(err, { extra: { error: 'Cache Redis Error' } });
  console.error('Cache Redis Error:', err);
});

cacheRedisClient.on('connect', () => {
  console.log('Connected to Cache Redis (db 0)');
});

// Job queue + results (db 1)
const jobRedisUrl = process.env.REDIS_JOB_URL || 'redis://localhost:6379/1';
export const jobRedisClient = createClient({ url: jobRedisUrl });

jobRedisClient.on('error', (err) => {
  Sentry.captureException(err, { extra: { error: 'Job Redis Error' } });
  console.error('Job Redis Error:', err);
});

jobRedisClient.on('connect', () => {
  console.log('Connected to Job Redis (db 1)');
});

export const connectRedis = async () => {
  if (!cacheRedisClient.isOpen) await cacheRedisClient.connect();
  if (!jobRedisClient.isOpen) await jobRedisClient.connect();
};

export const connectJobRedis = async () => {
  if (!jobRedisClient.isOpen) await jobRedisClient.connect();
};

export default cacheRedisClient; // For general API cache
