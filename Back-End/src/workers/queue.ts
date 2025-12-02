// workers/queue.ts
import { Queue, Worker, Job } from 'bullmq';
import { readFile, unlink } from 'fs/promises';
import { buildTimeline } from '../services/timeline/timelineService';
import { cacheJobResult } from '../lib/cache';

export type CourseProcessorJobData =
  | { jobId: string; kind: 'file'; filePath: string }
  | { jobId: string; kind: 'body'; body: any };

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || '6379'),
};

export const queue = new Queue<CourseProcessorJobData>('courseProcessor', {
  connection: redisOptions,
});

const CONCURRENCY = 2;

export const courseProcessorWorker = new Worker<CourseProcessorJobData>(
  'courseProcessor',
  async (job: Job<CourseProcessorJobData>) => {
    const { jobId } = job.data;

    try {
      let result;

      if (job.data.kind === 'file') {
        const fileBuffer = await readFile(job.data.filePath);

        result = await buildTimeline({
          type: 'file',
          data: fileBuffer,
        });
      } else {
        // kind === "body"
        result = await buildTimeline({
          type: 'form',
          data: job.data.body,
        });
      }

      await cacheJobResult(jobId, {
        payload: { status: 'done', data: result },
      });
    } catch (err) {
      console.error(`Error processing job ${jobId}:`, err);
      throw err;
    } finally {
      if (job.data.kind === 'file') {
        const { filePath } = job.data;
        try {
          await unlink(filePath);
        } catch (unlinkErr) {
          if (unlinkErr instanceof Error) {
            console.warn(
              `Failed to delete temp file ${filePath}:`,
              unlinkErr.message,
            );
          } else {
            console.warn(`Failed to delete temp file ${filePath}:`, unlinkErr);
          }
        }
      }
    }
  },
  {
    connection: redisOptions,
    concurrency: CONCURRENCY,
  },
);
