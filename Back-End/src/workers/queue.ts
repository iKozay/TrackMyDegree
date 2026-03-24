import { Queue } from 'bullmq';

export type CourseProcessorJobData =
  | { jobId: string; kind: 'file'; filePath: string }
  | { jobId: string; kind: 'body'; body: any }
  | { jobId: string; kind: 'timelineData'; timelineId: string };

export const redisOptions = {
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
