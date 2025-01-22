import express, { Request, Response } from "express";
import coursepoolController           from "@controllers/coursepoolController/coursepoolController";
import CoursePoolTypes                from "@controllers/coursepoolController/coursepool_types"; 
import DB_OPS                         from "@Util/DB_Ops";
import HTTP                           from "@Util/HTTPCodes";

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  const payload = req.body;

  if( ! payload ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload containing name of coursepool\
               is required for create." });

    return;
  }

  const { name } = payload;

  if( 0 === name.length ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "CoursePool name cannot be empty" });

    return;
  }

  try {
    const response = await coursepoolController.createCoursePool(name);

    if( DB_OPS.SUCCESS === response ) {
      res.status(HTTP.CREATED).json
      ({ res: "New CoursePool added successfully" });
    } 
    if( DB_OPS.MOSTLY_OK === response ) {
      res.status(HTTP.SERVER_ERR).json
      ({ res: "Error in adding new CoursePool to database" });
    }
    if( DB_OPS.FAILURE === response ) {
      throw new Error("Error in establishing connection to database");
    }
  } 
  catch ( error ) {
    console.error("Error in /coursepool/create", error);
    res.status(HTTP.SERVER_ERR).json({ error: "CoursePool could not be created" });
  }

});

router.get('/getAll', async (req: Request, res: Response) => {
  try {
    const response = await coursepoolController.getAllCoursePools();

    if( ! response ) {
      res.status(HTTP.NOT_FOUND).json({ error: "No Course pools found" });
    }

    res.status(HTTP.OK).json(response);
  } 
  catch ( error ) {
    console.error("Error in /coursepool/getAll", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "Course Pools could not be fetched" });
  }
});

router.post('/get', async (req: Request, res: Response) => {
  const { course_pool_id } = req.body;

  if( ! course_pool_id ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Course Pool ID is required to get course pool." });

    return;
  }

  try {
    const response = await coursepoolController.getCoursePool(course_pool_id);
    
    if( response ) {
      res.status(HTTP.OK).json(response);
    }
    else {
      res.status(HTTP.NOT_FOUND).json({ error: "Course Pool not found" })
    }
  } 
  catch (error) {
    console.error("Error in /coursepool/get", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "Could not retrieve Course Pool" });
  }

});

router.post('/update', async (req: Request, res: Response) => {
  const payload:CoursePoolTypes.CoursePoolItem = req.body;

  if( ( ! payload ) || ( Object.keys(payload).length < 2 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload of type CoursePoolItem is required for update." });

    return;
  }

  if( ( ! payload.id) || ( ! payload.name) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload attributes cannot be empty" });

    return;
  }

  try {
    const response = await coursepoolController.updateCoursePool(payload);

    if( DB_OPS.SUCCESS === response ) {
      res.status(HTTP.OK).json
      ({ message: "CoursePool item updated successfully" });
    } 
    if( DB_OPS.MOSTLY_OK === response ) {
      res.status(HTTP.NOT_FOUND).json
      ({ error: "Item not found in CoursePool" });
    }
    if( DB_OPS.FAILURE === response ) {
      throw new Error("CoursePool item could not be updated");
    }

  } catch ( error ) {
    console.error("Error in /coursepool/update", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "CoursePool item could not be updated" });
  }

});

router.post('/delete', async (req: Request, res: Response) => {
  const payload = req.body;

  if( ( ! payload ) || ( Object.keys(payload).length < 1 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "ID is required to\
               remove item from CoursePool." });

    return;
  }

  if( ! payload.course_pool_id ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload attributes cannot be empty" });

    return;
  }

  const { course_pool_id } = payload;

  try {
    const response = await coursepoolController
                  .removeCoursePool(course_pool_id);

    if( DB_OPS.SUCCESS === response ) {
      res.status(HTTP.OK).json({ message: "Item removed from CoursePool" });
    } 
    if( DB_OPS.MOSTLY_OK === response ) {
      res.status(HTTP.NOT_FOUND).json({ error: "Item not found in CoursePool" });
    }
    if( DB_OPS.FAILURE === response ) {
      throw new Error("CoursePool item could not be deleted");
    }

  } catch ( error ) {
    console.error("Error in /coursepool/delete", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "CoursePool item could not be deleted" });
  }
  
});

export default router;