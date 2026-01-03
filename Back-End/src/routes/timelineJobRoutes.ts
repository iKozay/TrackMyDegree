import express from 'express';
import {
  getTimelineByJobId,
  cacheTimelineByJobId,
} from '../controllers/timelineJobController';

const router = express.Router();

router.get('/:jobId', getTimelineByJobId);

router.post('/:jobId', cacheTimelineByJobId);

export default router;
