import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectJobRedis } from '@lib/redisClient';
import { courseProcessorWorker } from './workers/queue';

Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1 });

if (process.env.NODE_ENV === 'development') {
  // Try to load the file, but don't force it
  const result = dotenv.config({
    path: path.resolve(__dirname, '../../secrets/.env'),
  });

  if (result.error) {
    // If the file is missing, just log it. Docker already injected the vars!
    console.log('💡 No .env file found, using system environment variables.');
  } else {
    console.log('✅ Environment variables loaded from .env file');
  }
}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:changeme123@localhost:27017/trackmydegree';

const start = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Worker connected to MongoDB');

    await connectJobRedis();
    console.log('Worker started and listening for jobs...');
  } catch (err) {
    console.error('Failed to start worker:', err);
    Sentry.captureException(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down worker...');
  try {
    await courseProcessorWorker.close();
    await mongoose.connection.close();
    console.log('Worker shut down gracefully');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason: any) => {
  Sentry.captureException(reason);
  console.error('Unhandled Rejection in worker:', reason);
});

start();
