import { Queue, Worker, Job } from 'bullmq';
import { readFile, unlink } from 'node:fs/promises';
import {
  buildTimeline,
  buildTimelineFromDB,
} from '../services/timeline/timelineService';
import { cacheJobResult } from '../lib/cache';

export type CourseProcessorJobData =
  | { jobId: string; kind: 'file'; filePath: string }
  | { jobId: string; kind: 'body'; body: any }
  | { jobId: string; kind: 'timelineData'; timelineId: string };

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || '6379'),
  db: 1, // Use database 1 for queue
};

export const queue = new Queue<CourseProcessorJobData>('courseProcessor', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

const CONCURRENCY = 2;

export const courseProcessorWorker = new Worker<CourseProcessorJobData>(
  'courseProcessor',
  async (job: Job<CourseProcessorJobData>) => {
    const { jobId } = job.data;

    try {
      let result;
      switch (job.data.kind) {
        case 'file': {
          const fileBuffer = await readFile(job.data.filePath);
          result = await buildTimeline({
            type: 'file',
            data: fileBuffer,
          });
          break;
        }

        case 'body': {
          result = await buildTimeline({
            type: 'form',
            data: job.data.body,
          });
          break;
        }

        case 'timelineData': {
          result = await buildTimelineFromDB(job.data.timelineId);
          break;
        }

        default:
          throw new Error(`the job data type provided is not supported`);
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
        } catch (error_) {
          if (error_ instanceof Error) {
            console.warn(
              `Failed to delete temp file ${filePath}:`,
              error_.message,
            );
          } else {
            console.warn(`Failed to delete temp file ${filePath}:`, error_);
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

courseProcessorWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

courseProcessorWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
