import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { notFoundHandler, errorHandler } from '@middleware/errorHandler';

//Routes import
import authRouter from '@routes/authRoutes';
import coursesRouter from '@routes/courseRoutes';
import degreeRouter from '@routes/degreeRoutes';
import timelineRouter from '@routes/timelineRoutes';
import coursepoolRouter from '@routes/coursepoolRoutes';
import adminRouter from '@routes/adminRoutes';
import feedbackRouter from '@routes/feedbackRoutes';
import userRouter from '@routes/userRoutes';
import sectionsRoutes from '@routes/sectionsRoutes';
import uploadRouter from '@routes/uploadRoutes';
import timelineJobRouter from '@routes/timelineJobRoutes';

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
    path: path.resolve(__dirname, '../secrets/.env'),
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));

// Apply rate limiters of forgot-password and reset-password routes
app.use('/auth/forgot-password', forgotPasswordLimiter);
app.use('/auth/reset-password', resetPasswordLimiter);
app.use('/auth/login', loginLimiter);
app.use('/auth/signup', signupLimiter);

//Routes
app.use('/auth', authRouter);
app.use('/courses', coursesRouter);
app.use('/degree', degreeRouter);
app.use('/timeline', timelineRouter);
app.use('/coursepool', coursepoolRouter);
app.use('/users', userRouter);
app.use('/admin', adminRouter);
app.use('/feedback', feedbackRouter);
app.use('/section', sectionsRoutes);
app.use('/upload', uploadRouter);
app.use('/jobs', timelineJobRouter);

//Handle 404
app.use(notFoundHandler);

//Global Error Handler
app.use(errorHandler);

//Listen for requests
app.listen(PORT, () => {
  console.log(`Server listening on Port: ${PORT}`);
});

// This will make sure to capture unhandled async errors
process.on('unhandledRejection', (reason: any) => {
  Sentry.captureException(reason);
  console.error('Unhandled Rejection:', reason);
});

export default app;
