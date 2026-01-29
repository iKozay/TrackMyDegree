import { Router, Request, Response } from 'express';
import {  getJobResult } from '../lib/cache';
import { validateCoopTimeline } from '../services/coop/coopvalidationService';
import { CachedJobResult } from '../controllers/jobController';
const router = Router();

/**
 * GET /api/coop/validate/:jobId
 */
router.get('/validate/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

      // get result from cache
      const cachedTimeline = await getJobResult<CachedJobResult>(jobId as string);
  

    if (!cachedTimeline) {
      return res.status(404).json({ error: 'Timeline not found in cache' });
    }

    const timeline = cachedTimeline.payload.data;

    const result = validateCoopTimeline(timeline);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
