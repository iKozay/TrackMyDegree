import express from 'express';
import degreeRoutes from './degreeRoutes';
import courseRoutes from './courseRoutes';
import userRoutes from './userRoutes';
import feedbackRoutes from './feedbackRoutes';
import timelineRoutes from './timelineRoutes';
import adminRoutes from './adminRoutes';
import coursepoolRoutes from './coursepoolRoutes';
import authRoutes from './authRoutes';
import sessionRoutes from './sessionRoutes';
import sectionRouter from '@routes/sectionsRoutes';
import { forgotPasswordLimiter, loginLimiter, resetPasswordLimiter, signupLimiter } from '@middleware/rateLimiter';
import uploadRouter from '@routes/upload';

const router = express.Router();

router.use('/auth/forgot-password', forgotPasswordLimiter);
router.use('/auth/reset-password', resetPasswordLimiter);
router.use('/auth/login', loginLimiter);
router.use('/auth/signup', signupLimiter);

router.use('/degree', degreeRoutes);
router.use('/courses', courseRoutes);
router.use('/coursepool', coursepoolRoutes);
router.use('/users', userRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/timeline', timelineRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/session', sessionRoutes);
router.use('/section', sectionRouter);
router.use('/upload', uploadRouter);


export default router;
