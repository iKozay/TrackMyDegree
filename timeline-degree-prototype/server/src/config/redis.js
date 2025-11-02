import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();
export const redisClient = createClient({
    socket: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
});

redisClient.on("error", (err) => console.error("Redis error:", err));
await redisClient.connect();
console.log("✅ Redis connected");
