import express, { Request, Response } from 'express';
import timelineController from '@controllers/timelineController/timelineController';
import HTTP from '@Util/HTTPCodes';
//Yassine: The router can be just call the appropriate controller to handle everything. 
const router = express.Router();

// Yassine: We need to use proper http methods!
// Save (or update) a timeline.
// The entire timeline (including items and courses) is passed in the JSON body.
router.post('/save', async (req: Request, res: Response) => {
  const { timeline } = req.body;
  if (!timeline || Object.keys(timeline).length === 0) {
    res.status(HTTP.BAD_REQUEST).json({ error: 'Timeline data is required' });
    return;
  }

  try {
    const savedTimeline = await timelineController.saveTimeline(timeline);
    if (savedTimeline) {
      res.status(HTTP.OK).json(savedTimeline);
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Could not save timeline' });
    }
  } catch (error) {
    res.status(HTTP.SERVER_ERR).json({ error: 'Could not save timeline' });
  }
});

// get not post
router.post('/getAll', async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id || Object.keys(user_id).length === 0) {
    res.status(HTTP.BAD_REQUEST).json({ error: 'User ID is required' });
    return;
  }

  try {
    const timelines = await timelineController.getTimelinesByUser(user_id);
    if (timelines && timelines.length > 0) {
      res.status(HTTP.OK).json(timelines);
    } else {
      res.status(HTTP.OK).json({ message: 'No timelines found' });
    }
  } catch (error) {
    console.error('Error in /timeline/getAll', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Could not retrieve timelines' });
  }
});

//delete not post
router.post('/delete', async (req: Request, res: Response) => {
  const { timeline_id } = req.body;

  if (!timeline_id) {
    res.status(HTTP.NOT_FOUND).json({ error: 'Timeline ID is required' });
    return;
  }

  try {
    const result = await timelineController.removeUserTimeline(timeline_id);
    if (!result) {
      res.status(HTTP.NOT_FOUND).json({ message: result });
    }
    if (result.includes('deleted successfully')) {
      res.status(HTTP.OK).json({ message: result });
    } else if (result.includes('No timeline found')) {
      res.status(HTTP.NOT_FOUND).json({ error: result });
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: 'Internal Server Error' });
    }
  } catch (error) {
    res.status(HTTP.SERVER_ERR).json({ error: 'Failed to delete timeline' });
  }
});

export default router;
