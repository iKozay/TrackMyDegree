import { Router, Request, Response } from 'express';
import redisClient from '../lib/redisClient';
import { validateCoopTimeline } from '../services/coop/coopvalidationService';

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

    const cachedTimeline = await redisClient.get(jobId);

    if (!cachedTimeline) {
      return res.status(404).json({ error: 'Timeline not found in cache' });
    }

    const timeline = JSON.parse(cachedTimeline);

    const result = validateCoopTimeline(timeline);

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
