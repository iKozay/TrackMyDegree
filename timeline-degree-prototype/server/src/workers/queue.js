import { Queue, Worker } from "bullmq";
import { Job } from "../models/jobModel.js";
import { processUserData } from "../services/processService.js";
import { cacheJobResult } from "../lib/cache.js";
export const queue = new Queue("courseProcessor", {
    connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
});

// Worker that processes jobs
new Worker(
    "courseProcessor",
    async (job) => {
        const result = await processUserData();
        // cache only in Redis
        await cacheJobResult(job.data.jobId, result);

        // keep Mongo lean
        await Job.updateOne({ jobId: job.data.jobId }, { status: "done" });
        // await Job.updateOne({ jobId: job.data.jobId }, { status: "done", result });
    },
    { connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT } }
);
