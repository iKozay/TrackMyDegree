import Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import corsOptions from '@middleware/corsMiddleware';
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

//Dev Consts
const HOPPSCOTCH = 'chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld';

//Express Init
dotenv.config(); //Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 8000;
const CLIENT = process.env.CLIENT || 'http://localhost:3000';

Sentry.setupExpressErrorHandler(app);

// Apply the CORS middleware
app.use(cors(corsOptions));

// Preflight handling for all routes
app.options('*', cors(corsOptions));

// app.use(cors({ origin: [HOPPSCOTCH, CLIENT, "*"] }));
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
//app.use("/appUser", AppUser);
app.use('/data', userDataRouter);
app.use('/admin', Admin);
app.use('/requisite', requisiteRouter);
app.use('/feedback', feedbackRouter);
app.use('/session', sessionRouter);

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
app.use(errorHandler);

//Listen for requests
app.listen(PORT, () => {
  console.log(`Server listening on Port: ${PORT}`);
});
