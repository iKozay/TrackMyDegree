import express from 'express';
import { getByJobId } from '../controllers/jobController';

const router = express.Router();

router.get('/:jobId', getByJobId);

export default router;
