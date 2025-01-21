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


export default router;