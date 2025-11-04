import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { timelineController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// TIMELINE ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const TIMELINE_ID_REQUIRED = 'Timeline ID is required';
/**
 * POST /timeline - Save timeline
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const timelineData = req.body;

    if (
      !timelineData.user_id ||
      !timelineData.name ||
      !timelineData.degree_id
    ) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID, timeline name, and degree ID are required',
      });
      return;
    }

    const timeline = await timelineController.saveTimeline(timelineData);
    res.status(HTTP.CREATED).json(timeline);
  } catch (error) {
    console.error('Error in POST /timeline', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /timeline/user/:userId - Get timelines for user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID is required',
      });
      return;
    }

    const timelines = await timelineController.getTimelinesByUser(userId);
    res.status(HTTP.OK).json(timelines);
  } catch (error) {
    console.error('Error in GET /timeline/user/:userId', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /timeline/:id - Get timeline by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: TIMELINE_ID_REQUIRED,
      });
      return;
    }

    const timeline = await timelineController.getTimelineById(id);
    res.status(HTTP.OK).json(timeline);
  } catch (error) {
    console.error('Error in GET /timeline/:id', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * PUT /timeline/:id - Update timeline
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: TIMELINE_ID_REQUIRED,
      });
      return;
    }

    const timeline = await timelineController.updateTimeline(id, updates);
    res.status(HTTP.OK).json(timeline);
  } catch (error) {
    console.error('Error in PUT /timeline/:id', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * DELETE /timeline/:id - Delete timeline
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: TIMELINE_ID_REQUIRED,
      });
      return;
    }

    const result = await timelineController.removeUserTimeline(id);
    res.status(HTTP.OK).json(result);
  } catch (error) {
    console.error('Error in DELETE /timeline/:id', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * DELETE /timeline/user/:userId - Delete all timelines for user
 */
router.delete('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID is required',
      });
      return;
    }

    const count = await timelineController.deleteAllUserTimelines(userId);
    res.status(HTTP.OK).json({
      message: `Deleted ${count} timelines for user`,
    });
  } catch (error) {
    console.error('Error in DELETE /timeline/user/:userId', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
