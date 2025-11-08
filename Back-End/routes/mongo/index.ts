import express from 'express';
import degreeRoutes from './degreeRoutes';
import courseRoutes from './courseRoutes';
import userRoutes from './userRoutes';
import feedbackRoutes from './feedbackRoutes';
import timelineRoutes from './timelineRoutes';
import adminRoutes from './adminRoutes';
import coursepoolRoutes from './coursepoolRoutes';

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

router.use('/degree', degreeRoutes);
router.use('/courses', courseRoutes);
router.use('/coursepool', coursepoolRoutes);
router.use('/users', userRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/timeline', timelineRoutes);
router.use('/admin', adminRoutes);

export default router;
