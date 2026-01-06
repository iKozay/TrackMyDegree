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

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a Redis client instance using the provided URL
const redisClient = createClient({
  url: redisUrl,
});
// runtime error handling
redisClient.on('error', (err) => {
  // Listen for Redis errors, log them to the console, and report to Sentry
  Sentry.captureException(err, {
    extra: { error: 'Redis Client Error' }, // log context and actual error
  });
  console.error('Redis Client Error:', err);
});

// log successful connection
redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});
// Connect to Redis
// Establish a connection to the Redis server
// Explicit connect function (called once at app startup)
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

// Export the Redis client for use in other parts of the application
export default redisClient;
