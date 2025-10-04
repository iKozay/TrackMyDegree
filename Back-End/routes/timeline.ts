import express, { Request, Response } from 'express';
import timelineController from '@controllers/timelineController/timelineController';
import HTTP from '@Util/HTTPCodes';
import asyncHandler from '@middleware/asyncHandler';
import { validateTimelineBody, validateUserId, validateTimelineId } from '@middleware/timelineValidators';

const router = express.Router();

// POST / → Save a new timeline
router.post(
  '/',
  validateTimelineBody,
  asyncHandler(async (req: Request, res: Response) => {
    const { timeline } = req.body;

    if (!timeline || Object.keys(timeline).length === 0) {
      return res.status(HTTP.BAD_REQUEST).json({ error: 'Timeline data is required' });
    }

    const savedTimeline = await timelineController.saveTimeline(timeline);

    if (savedTimeline) {
      return res.status(HTTP.OK).json(savedTimeline);
    } else {
      return res.status(HTTP.SERVER_ERR).json({ error: 'Could not save timeline' });
    }
  })
);

// PUT /:timelineId → Update a timeline
router.put(
  '/:timelineId',
  validateTimelineBody,
  asyncHandler(async (req: Request, res: Response) => {
    const { timelineId } = req.params;
    const { timeline } = req.body;

    if (!timeline || Object.keys(timeline).length === 0) {
      return res.status(HTTP.BAD_REQUEST).json({ error: 'Timeline data is required' });
    }

    timeline.id = timelineId; // Ensure correct ID for update
    const savedTimeline = await timelineController.saveTimeline(timeline);

    if (savedTimeline) {
      return res.status(HTTP.OK).json(savedTimeline);
    } else {
      return res.status(HTTP.SERVER_ERR).json({ error: 'Could not save/update timeline' });
    }
  })
);

// GET /user/:userId → Get timelines for a user
router.get(
  '/user/:userId',
  validateUserId,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const timelines = await timelineController.getTimelinesByUser(userId);

    if (timelines && timelines.length > 0) {
      return res.status(HTTP.OK).json(timelines);
    } else {
      return res.status(HTTP.OK).json({ message: 'No timelines found' });
    }
  })
);

// DELETE /:timelineId → Delete a timeline
router.delete(
  '/:timelineId',
  validateTimelineId,
  asyncHandler(async (req: Request, res: Response) => {
    const { timelineId } = req.params;
    const result = await timelineController.removeUserTimeline(timelineId);

    if (!result) {
      return res.status(HTTP.NOT_FOUND).json({ message: result });
    }

    if (result.includes('deleted successfully')) {
      return res.status(HTTP.OK).json({ message: result });
    } else if (result.includes('No timeline found')) {
      return res.status(HTTP.NOT_FOUND).json({ error: result });
    } else {
      return res.status(HTTP.SERVER_ERR).json({ error: 'Internal Server Error' });
    }
  })
);

export default router;
