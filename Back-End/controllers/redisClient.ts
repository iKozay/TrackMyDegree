// RedisClient.ts
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect to Redis
redisClient.connect();

export default redisClient;
