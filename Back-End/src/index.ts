import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { notFoundHandler, errorHandler } from '@middleware/errorHandler';

import { connectRedis } from '@lib/redisClient';

//Routes import
import authRouter from '@routes/authRoutes';
import coursesRouter from '@routes/courseRoutes';
import degreeRouter from '@routes/degreeRoutes';
import timelineRouter from '@routes/timelineRoutes';
import coursepoolRouter from '@routes/coursepoolRoutes';
import adminRouter from '@routes/adminRoutes';
import userRouter from '@routes/userRoutes';
import sectionsRoutes from '@routes/sectionsRoutes';
import uploadRouter from '@routes/uploadRoutes';
import jobRouter from '@routes/jobRoutes';
import degreeAuditRouter from '@routes/degreeAuditRoutes';
import coopvalidationRouter from '@routes/coopvalidationRoutes';
import creditFormRouter from '@routes/creditFormRoutes';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import {
  forgotPasswordLimiter,
  loginLimiter,
  resetPasswordLimiter,
  signupLimiter,
} from '@middleware/rateLimiter';
// sentry init
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1,
  profilesSampleRate: 1,
});

//Express Init
if (process.env.NODE_ENV === 'development') {
  const loadEnv = dotenv.config({
    path: path.resolve(__dirname, '../../secrets/.env'),
    debug: true,
  });
  if (loadEnv.error) {
    console.error('Error loading .env file:', loadEnv.error);
    throw loadEnv.error;
  } else {
    console.log('Environment variables loaded successfully');
  }
}
// For production and staging, env vars are injected automatically via Docker

const app = express();
const PORT = process.env.BACKEND_PORT || 8000;

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:changeme123@localhost:27017/trackmydegree';

// Connect to MongoDB using async/await
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error: Error) => {
    console.error('Error connecting to MongoDB:', error);
    Sentry.captureException(error);
  });

mongoose.connection.on('error', (error: Error) => {
  console.error('MongoDB connection error:', error);
  Sentry.captureException(error);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

Sentry.setupExpressErrorHandler(app);

if (process.env.NODE_ENV === 'development') {
  const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));
}

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Swagger (docs)
app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/openapi.json', (_req, res) => res.json(swaggerSpec));

// Apply rate limiters of forgot-password and reset-password routes
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/signup', signupLimiter);

//Routes
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/degree', degreeRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/coursepool', coursepoolRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/section', sectionsRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/audit', degreeAuditRouter);
app.use('/api/coop', coopvalidationRouter);
app.use('/api/credit-forms', creditFormRouter);

//Handle 404
app.use(notFoundHandler);

//Global Error Handler
app.use(errorHandler);

//Listen for requests
//start the server only after Redis + Mongo are connected or attempted
const start = async () => {
  try {
    await connectRedis();
  } catch (err) {
    // Don’t crash the server if Redis is down (optional)
    console.warn('⚠️ Redis not available, caching disabled:', err);
    Sentry.captureException(err);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
  });
};

start();

// This will make sure to capture unhandled async errors
process.on('unhandledRejection', (reason: any) => {
  Sentry.captureException(reason);
  console.error('Unhandled Rejection:', reason);
});

export default app;
