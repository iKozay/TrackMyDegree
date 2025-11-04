import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import Database from '@controllers/DBController/DBController';
import HTTP from '@Util/HTTPCodes';
import {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter,
  signupLimiter,
} from '@middleware/rateLimiter';
import { notFoundHandler, errorHandler } from '@middleware/errorHandler';

//Routes import
import authRouter from '@routes/auth';
import coursesRouter from '@routes/courses';
import exemptionRouter from '@routes/exemption';
import deficiencyRouter from '@routes/deficiency';
import degreeRouter from '@routes/degree';
import timelineRouter from '@routes/timeline';
import coursepoolRouter from '@routes/coursepool';
import userDataRouter from '@routes/userData';
import Admin from '@routes/adminRoutes';
import requisiteRouter from '@routes/requisite';
import feedbackRouter from '@routes/feedback';
import sessionRouter from '@routes/session';
import sectionsRoutes from '@routes/sectionsRoutes';
import transcriptRouter from '@routes/transcript';
import mongoRouter from '@routes/mongo';

// sentry init
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1,
  profilesSampleRate: 1,
});

//Express Init
dotenv.config(); //Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 8000;

Sentry.setupExpressErrorHandler(app);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Apply rate limiters of forgot-password and reset-password routes
app.use('/auth/forgot-password', forgotPasswordLimiter);
app.use('/auth/reset-password', resetPasswordLimiter);
app.use('/auth/login', loginLimiter);
app.use('/auth/signup', signupLimiter);

//Routes
app.use('/auth', authRouter);
app.use('/courses', coursesRouter);
app.use('/degree', degreeRouter);
app.use('/exemption', exemptionRouter);
app.use('/deficiency', deficiencyRouter);
app.use('/timeline', timelineRouter);
app.use('/coursepool', coursepoolRouter);
app.use('/data', userDataRouter);
app.use('/admin', Admin);
app.use('/requisite', requisiteRouter);
app.use('/feedback', feedbackRouter);
app.use('/session', sessionRouter);
app.use('/section', sectionsRoutes);
app.use('/transcript', transcriptRouter);

// MongoDB consolidated routes
app.use('/v2', mongoRouter);

/**
 * DB test route
 * TO BE REMOVED
 */
app.get('/test-db', async (req, res) => {
  try {
    const pool = await Database.getConnection();
    if (pool) {
      const result = await pool.request().query('SELECT 1 AS number');
      res.status(HTTP.OK).send({
        message: 'Database connected successfully!',
        result: result.recordset,
      });
    } else {
      throw new Error('Connection error in test-db');
    }
  } catch (error) {
    res
      .status(HTTP.SERVER_ERR)
      .send({ message: 'Database connection failed', error });
  }
});

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