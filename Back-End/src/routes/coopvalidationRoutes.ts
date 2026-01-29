import { Router, Request, Response } from 'express';
import redisClient from '@/config/redis';
import { validateCoopTimeline } from '@/services/coop/coopvalidationService';

const router = Router();

/**
 * GET /api/coop/validate/:jobId
 * Retrieves timeline from Redis cache and validates it
 */
router.get('/validate/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const cachedTimeline = await redisClient.get(jobId);

    if (!cachedTimeline) {
      return res.status(404).json({
        error: 'Timeline not found in cache',
      });
    }

    const timeline = JSON.parse(cachedTimeline);

    const validationResult = validateCoopTimeline(timeline);

    return res.status(200).json(validationResult);
  } catch (error) {
    console.error('Co-op validation error:', error);
    return res.status(500).json({
      error: 'Failed to validate Co-op timeline',
    });
  }
});

export default router;
