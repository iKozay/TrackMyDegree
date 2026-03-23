import { Worker, Job } from 'bullmq';
import { readFile, unlink } from 'node:fs/promises';
import {
  buildTimeline,
  buildTimelineFromDB,
} from '../services/timeline/timelineBuilder';
import { cacheJobResult } from '../lib/cache';
import { redisOptions } from './queue';
import type { CourseProcessorJobData } from './queue';

const CONCURRENCY = 2;

export const courseProcessorWorker = new Worker<CourseProcessorJobData>(
  'courseProcessor',
  async (job: Job<CourseProcessorJobData>) => {
    const { jobId } = job.data;
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 3);

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

      // Delete temp file only after successful processing
      if (job.data.kind === 'file') {
        await unlink(job.data.filePath).catch(() => {});
      }
    } catch (err) {
      console.error(`Error processing job ${jobId}:`, err);

      // Clean up temp file only on the last attempt so retries can still read it
      if (isLastAttempt && job.data.kind === 'file') {
        await unlink(job.data.filePath).catch(() => {});
      }

      throw err;
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
