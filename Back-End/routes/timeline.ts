import express, { Request, Response } from "express";
import timelineController from "@controllers/timelineController/timelineController";
import HTTP from "@Util/HTTPCodes";

const router = express.Router();

// Save (or update) a timeline. 
// The entire timeline (including items and courses) is passed in the JSON body.
router.post("/save", async (req: Request, res: Response) => {
  const timeline = req.body;
  if (!timeline) {
    res.status(HTTP.BAD_REQUEST).json({ error: "Timeline data is required" });
    return;
  }

  try {
    const savedTimeline = await timelineController.saveTimeline(timeline);
    if (savedTimeline) {
      res.status(HTTP.OK).json(savedTimeline);
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: "Could not save timeline" });
    }
  } catch (error) {
    console.error("Error in /timeline/save", error);
    res.status(HTTP.SERVER_ERR).json({ error: "Could not save timeline" });
  }
});

router.post("/getAll", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) {
    res.status(HTTP.BAD_REQUEST).json({ error: "User ID is required" });
    return;
  }

  try {
    const timelines = await timelineController.getTimelinesByUser(user_id);
    if (timelines && timelines.length > 0) {
      res.status(HTTP.OK).json(timelines);
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: "No timelines found" });
    }
  } catch (error) {
    console.error("Error in /timeline/getAll", error);
    res.status(HTTP.SERVER_ERR).json({ error: "Could not retrieve timelines" });
  }
});


// Get all timelines for a given user (via JSON body)
router.post("/getAll", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) {
    res.status(HTTP.BAD_REQUEST).json({ error: "User ID is required" });
    return;
  }

  try {
    const timelines = await timelineController.getTimelinesByUser(user_id);
    if (timelines && timelines.length > 0) {
      res.status(HTTP.OK).json(timelines);
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: "No timelines found" });
    }
  } catch (error) {
    console.error("Error in /timeline/getAll", error);
    res.status(HTTP.SERVER_ERR).json({ error: "Could not retrieve timelines" });
  }
});

export default router;
