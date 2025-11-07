import express from 'express';
import degreeRoutes from './degreeRoutes';
import courseRoutes from './courseRoutes';
import userRoutes from './userRoutes';
import feedbackRoutes from './feedbackRoutes';
import timelineRoutes from './timelineRoutes';
import adminRoutes from './adminRoutes';
import coursepoolRoutes from './coursepoolRoutes';

const router = express.Router();

router.use('/degree', degreeRoutes);
router.use('/courses', courseRoutes);
router.use('/coursepool', coursepoolRoutes);
router.use('/users', userRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/timeline', timelineRoutes);
router.use('/admin', adminRoutes);

export default router;
