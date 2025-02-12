import express, { Request, Response } from "express";
import timelineController             from "@controllers/timelineController/timelineController";
import TimelineTypes                  from "@controllers/timelineController/timeline_types";
import DB_OPS                         from "@Util/DB_Ops";
import HTTP                           from "@Util/HTTPCodes";

const router = express.Router();

router.post('/save', async (req: Request, res: Response) => {
  const payload: { user_id: string, name: string, items: { timeline_id: string, semesterName: string, coursecode: string[] }[] }[] = req.body;                                                         

  if( ( ! payload ) || ( Object.keys(payload).length < 2 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload of type UserTimeline is required for save." });

    return;
  }

  try {
    const response  = await timelineController.saveTimeline(payload);
  
    if( DB_OPS.SUCCESS === response ) {
      res.status(HTTP.CREATED).json
      ({ res: "All courses added to user timeline" });
    } 
    if( DB_OPS.MOSTLY_OK === response ) {
      res.status(HTTP.CREATED).json
      ({ res: "Some courses were not added to user timeline" });
    }
    if( DB_OPS.FAILURE === response ) {
      throw new Error("Error in establishing connection to database");
    }
  } 
  catch (error) {
    console.error("Error in /timeline/save", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "Timeline could not be created" });
  }
});

router.post('/getAll', async (req: Request, res: Response) => {
  const payload = req.body;

  if( ( ! payload ) || ( Object.keys(payload).length < 1 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "User ID is required to get timeline." });

    return;
  }

  if( ! payload.user_id ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload attributes cannot be empty" });

    return;
  }

  const { user_id } = payload;

  try {
    const result = await timelineController.getAllTimelines(user_id);
    
    let timelines: Record<string, { 
      id: string;
      name: string;
      user_id: string;
      semesters: Record<string, any[]>;
    }>       = {};
    if( (result) ) {
      for (const timeline of result){

        const { id, name, user_id, items } = timeline;
        if (!timelines[id]) {
          timelines[id] = {
            id,
            name,
            user_id,
            semesters: {} // Group items by semester
          };
        }
        for (const item of items) {
          const { season, year, coursecode } = item;
          const current_semester = `${season} ${year}`;
          // console.log(item)
          // Ensure each semester exists before adding items
          if (!timelines[id].semesters[current_semester]) {
            timelines[id].semesters[current_semester] = [];
          }

          timelines[id].semesters[current_semester].push({
            timeline_item_id: item.id,
            coursecode: coursecode
          });
        }
      
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
    ({ error: 
    "Timeline item ID is required to remove item from timeline." });

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