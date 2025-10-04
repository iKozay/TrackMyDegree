import express, { Request, Response } from 'express';
import timelineController from '@controllers/timelineController/timelineController';
import HTTP from '@Util/HTTPCodes';
//Yassine: The router can be just call the appropriate controller to handle everything. 
const router = express.Router();

// Mocro : POST /save → Save or update a timeline
// Mocro : Expects a 'timeline' object in the JSON body, including items and courses
// Mocro : Current behavior:
//        - Checks if timeline exists in body; returns 400 if missing
//        - Calls controller to save timeline
//        - Returns 200 with saved timeline if successful
//        - Returns 500 if save fails or exception occurs
// Mocro : How it can be refactored:
//        1. Move validation to a middleware to remove repeated code
//        2. Use a centralized async error handler instead of try/catch in each route
//        3. Consider using PUT for updates and POST for creation to follow REST
// Yassine: We need to use proper http methods!
// Save (or update) a timeline.
// The entire timeline (including items and courses) is passed in the JSON body.
router.post('/', async (req: Request, res: Response) => {
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

router.put('/:timelineId', async (req: Request, res: Response) => {
  const { timelineId } = req.params;
  const { timeline } = req.body;

  if (!timeline || Object.keys(timeline).length === 0) {
    return res.status(400).json({ error: 'Timeline data is required' });
  }

  try {
    // Reuse existing saveTimeline for update
    timeline.id = timelineId; // Ensure the timeline object has the correct ID
    const savedTimeline = await timelineController.saveTimeline(timeline);

    if (savedTimeline) {
      return res.status(200).json(savedTimeline);
    } else {
      return res.status(500).json({ error: 'Could not save/update timeline' });
    }
  } catch (error) {
    console.error('Error updating timeline:', error);
    return res.status(500).json({ error: 'Could not save/update timeline' });
  }
});


// Mocro : POST /getAll → Get all timelines for a user
// Mocro : Expects 'user_id' in the JSON body
// Mocro : Current behavior:
//        - Validates presence of user_id; returns 400 if missing
//        - Calls controller to fetch timelines
//        - Returns 200 with timelines or message if none found
//        - Logs error and returns 500 if exception occurs
// Mocro : How it can be refactored:
//        1. Change method to GET and pass user_id as URL param for REST compliance
//        2. Move validation to middleware
//        3. Use centralized async handler to remove try/catch
//        4. Add pagination if user has many timelines
// get not post
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
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

// Mocro : POST /delete → Delete a timeline
// Mocro : Expects 'timeline_id' in the JSON body
// Mocro : Current behavior:
//        - Validates timeline_id; returns 404 if missing
//        - Calls controller to remove timeline
//        - Checks controller message to determine HTTP response
//        - Returns 200 if deleted, 404 if not found, 500 for other errors
// Mocro : How it can be refactored:
//        1. Use DELETE method with timeline_id as URL param
//        2. Move validation to middleware
//        3. Centralize async error handling
//        4. Standardize HTTP responses instead of parsing result string
//delete not post
router.delete('/:timelineId', async (req: Request, res: Response) => {
  const { timelineId } = req.params;
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
