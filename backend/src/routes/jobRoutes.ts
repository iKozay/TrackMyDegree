import express from 'express';
import { getByJobId, cacheTimelineByJobId } from '../controllers/jobController';

const router = express.Router();

router.get('/:jobId', getByJobId);

router.post('/:jobId', cacheTimelineByJobId);

export default router;
