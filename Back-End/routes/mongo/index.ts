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
import {
  forgotPasswordLimiter,
  loginLimiter,
  resetPasswordLimiter,
  signupLimiter,
} from '@middleware/rateLimiter';
import uploadRouter from '@routes/upload';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Degrees (v2)
 *     description: Mongo-backed degree endpoints (v2)
 *   - name: Courses (v2)
 *     description: Mongo-backed course endpoints (v2)
 *   - name: CoursePools (v2)
 *     description: Mongo-backed course pool endpoints (v2)
 *   - name: Users (v2)
 *     description: Mongo-backed user endpoints (v2)
 *   - name: Feedback (v2)
 *     description: Mongo-backed feedback endpoints (v2)
 *   - name: Timelines (v2)
 *     description: Mongo-backed timeline endpoints (v2)
 *   - name: Admin (v2)
 *     description: Mongo-backed administrative endpoints (v2)
 *   - name: Auth (v2)
 *     description: Mongo-backed auth endpoints (v2)
 *   - name: Session (v2)
 *     description: Mongo-backed session endpoints (v2)
 *   - name: Section (v2)
 *     description: Concordia-Opendata-backed sections endpoints (v2)
 *   - name: Upload (v2)
 *     description: pdf parsing endpoints (v2)
 */

/**
 * @openapi
 * /v2:
 *   get:
 *     summary: API root (v2)
 *     description: Returns a simple confirmation message for the v2 Mongo API.
 *     tags: [Admin (v2)]
 *     responses:
 *       200:
 *         description: API root is active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to TrackMyDegree Mongo API v2
 */
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to TrackMyDegree Mongo API v2' });
});

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
