import express, { Request, Response } from "express";
import timelineController             from "@controllers/timelineController/timelineController";
import TimelineTypes                  from "@controllers/timelineController/timeline_types";
import HTTP                           from "@Util/HTTPCodes";

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  const payload: TimelineTypes.UserTimeline = req.body;

  if( ! payload) {
    res.status(HTTP.BAD_REQUEST).json({ error: "Payload of type UserTimeline is required for create." });
    return;
  }

  try {
    const response  = await timelineController.createTimeline(payload);
    const INSERTION = TimelineTypes.TimelineResponse;  
  
    if( INSERTION.SUCCESS === response ) {
      res.status(HTTP.CREATED).json({ res: "All courses added to user timeline" });
    } 
    if( INSERTION.MOSTLY_OK === response ) {
      res.status(HTTP.CREATED).json({ res: "Some courses were not added to user timeline" });
    }
    if( INSERTION.FAILURE === response ) {
      throw new Error("Error in establishing connection to database");
    }
  } 
  catch (error) {
    console.error("Error in /timeline/create", error);
    res.status(HTTP.SERVER_ERR).json({ error: "Timeline could not be created" });
  }
});


export default router;