"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const node_1 = __importDefault(require("@sentry/node"));
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
// Create a Redis client instance using the provided URL
const redisClient = (0, redis_1.createClient)({
    url: redisUrl,
});
redisClient.on('error', (err) => {
    // Listen for Redis errors, log them to the console, and report to Sentry
    node_1.default.captureException({ error: 'Redis Client Error' });
    console.error('Redis Client Error:', err);
});
// Connect to Redis
// Establish a connection to the Redis server
redisClient.connect();
// Export the Redis client for use in other parts of the application
exports.default = redisClient;
