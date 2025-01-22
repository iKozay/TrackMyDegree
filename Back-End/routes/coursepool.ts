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
  catch (error) {
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
  catch (error) {
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

export default router;