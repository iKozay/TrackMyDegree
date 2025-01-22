import express, { Request, Response } from "express";
import timelineController             from "@controllers/timelineController/timelineController";
import TimelineTypes                  from "@controllers/timelineController/timeline_types";
import DB_OPS                         from "@Util/DB_Ops";
import HTTP                           from "@Util/HTTPCodes";

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  const payload: TimelineTypes.UserTimeline = req.body;                                                         

  if( ( ! payload ) || ( Object.keys(payload).length < 2 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload of type UserTimeline is required for create." });

    return;
  }

  try {
    const response  = await timelineController.createTimeline(payload);
  
    if( DB_OPS.SUCCESS === response ) {
      res.status(HTTP.CREATED).json({ res: "All courses added to user timeline" });
    } 
    if( DB_OPS.MOSTLY_OK === response ) {
      res.status(HTTP.CREATED).json({ res: "Some courses were not added to user timeline" });
    }
    if( DB_OPS.FAILURE === response ) {
      throw new Error("Error in establishing connection to database");
    }
  } 
  catch (error) {
    console.error("Error in /timeline/create", error);
    res.status(HTTP.SERVER_ERR).json({ error: "Timeline could not be created" });
  }
});

router.post('/getAll', async (req: Request, res: Response) => {
  const payload = req.body;

  if( ( ! payload ) || ( Object.keys(payload).length < 1 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "User ID is required to get timeline." });

    return;
  }

  if( ! payload.timeline_item_id ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload attributes cannot be empty" });

    return;
  }

  const { user_id } = payload;

  try {
    const result = await timelineController.getAllTimelines(user_id);
    
    if( (result) && (result.timeline_items.length > 0) ) {
      const { timeline_items } = result;
      let timelines: any       = {};

      for(let i = 0; i < timeline_items.length; i++) {
        const { season, year } = timeline_items[i];
        const semesters        = Object.keys(timelines);
        const current_semester = season + " " + year;

        if( ! semesters.find( item => item === current_semester ) ) {
          timelines[current_semester] = [];
        }

        timelines[current_semester].push({
          timeline_item_id : timeline_items[i].id,
          coursecode       : timeline_items[i].coursecode
        });
        
      }

      res.status(HTTP.OK).json(timelines);
    }
    else {
      res.status(HTTP.NOT_FOUND).json({ error: "No timelines found" });
    }

  } catch ( error ) {
    console.error("Error in /timeline/get", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "Timeline could not be fetched" });
  }
});

router.post('/delete', async (req: Request, res: Response) => {
  const payload = req.body;

  if( ( ! payload ) || ( Object.keys(payload).length < 1 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Timeline item ID is required to\
               remove item from timeline." });

    return;
  }

  if( ! payload.timeline_item_id ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload attributes cannot be empty" });

    return;
  }

  const { timeline_item_id } = payload;

  try {
    const response = await timelineController
                  .removeTimelineItem(timeline_item_id);

    if( DB_OPS.SUCCESS === response ) {
      res.status(HTTP.OK).json({ message: "Item removed from timeline" });
    } 
    if( DB_OPS.MOSTLY_OK === response ) {
      res.status(HTTP.NOT_FOUND).json({ error: "Item not found in timeline" });
    }
    if( DB_OPS.FAILURE === response ) {
      throw new Error("Timeline item could not be deleted");
    }

  } catch ( error ) {
    console.error("Error in /timeline/delete", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "Timeline item could not be deleted" });
  }

});

export default router;