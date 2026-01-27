import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

import { assignJobId, RequestWithJobId } from '@middleware/assignJobId';
import { queue } from '../workers/queue';
import { getJobResult } from '../lib/cache';

import { validateCoopTimeline } from '@services/coop/coopvalidationService';
import { TimelineResult } from '@services/timeline/timelineService';

const router = express.Router();

const INTERNAL_SERVER_ERROR = 'Internal server error';
const INVALID_ID_FORMAT = 'Invalid timeline id format';

/**
 * GET /coop/validate/:timelineId
 *
 * Uses the SAME async cache-based pattern as GET /timeline/:id
 */
router.get(
  '/validate/:timelineId',
  assignJobId,
  async (req: Request, res: Response) => {
    try {
      const { timelineId } = req.params;
      const { jobId } = req as RequestWithJobId;

      if (!mongoose.Types.ObjectId.isValid(timelineId as string)) {
        return res.status(HTTP.BAD_REQUEST).json({
          error: INVALID_ID_FORMAT,
        });
      }

      if (!jobId) {
        return res.status(HTTP.SERVER_ERR).json({
          error: 'Job ID missing',
        });
      }

      // enqueue timeline fetch (same as timelineRoutes.ts)
      await queue.add('processData', {
        jobId,
        kind: 'timelineData',
        timelineId: timelineId as string,
      });

      return res.status(HTTP.ACCEPTED).json({
        jobId,
        status: 'processing',
      });
    } catch (error) {
      console.error('Error in GET /coop/validate/:timelineId', error);
      return res.status(HTTP.SERVER_ERR).json({
        error: INTERNAL_SERVER_ERROR,
      });
    }
  }
);

/**
 * GET /coop/validate/result/:jobId
 *
 * Reads timeline from cache and runs Co-op validation
 */
router.get(
  '/validate/result/:jobId',
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const cached = await getJobResult<TimelineResult>(jobId as string);

      if (!cached) {
        return res.status(410).json({
          error: 'Result expired',
        });
      }

      const timeline = cached.payload.data;

      const validationResult = validateCoopTimeline(timeline);

      return res.status(HTTP.OK).json(validationResult);
    } catch (error) {
      console.error('Error in GET /coop/validate/result/:jobId', error);
      return res.status(HTTP.SERVER_ERR).json({
        error: INTERNAL_SERVER_ERROR,
      });
    }
  }
);

export default router;
