import HTTP from "@Util/HTTPCodes";
import express, { Request, Response } from "express";
import degreeController from "@controllers/degreeController/degreeController";
import DegreeXCPController from "@controllers/DegreeXCPController/DegreeXCPController";
import CourseXCPController from "@controllers/CourseXCPController/CourseXCPController";

const router = express.Router();

router.post('/degree/create', async (req: Request, res: Response) => {
    const { id, name, totalCredits } = req.query;
  
    try {
      // Validate input
      if (!id || !name || typeof totalCredits !== 'number' || typeof id !== 'string' 
            || typeof name !== 'string') {

        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id, name, and totalCredits as a number.',
        });
        return;
      }
  
      // Call the service function
      const newDegree = await degreeController.createDegree(id, name, totalCredits);
  
      // Send success response
      res.status(HTTP.CREATED).json({
        message: 'Degree created successfully.',
        degree: newDegree,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Degree with this id or name already exists.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /degree/create';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });
  

  router.get('/degree/read', async (req: Request, res: Response) => {
    const { id } = req.query;
  
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id as a string.',
        });
        return;
      }
  
      // Call the service function
      const newDegree = await degreeController.readDegree(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Degree read successfully.',
        degree: newDegree,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Degree with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /degree/read';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.get('/degree/update', async (req: Request, res: Response) => {
    const { id, name, totalCredits } = req.query;
  
    try {
      // Validate input
      if (!id || !name || typeof totalCredits !== 'number' || typeof id !== 'string' 
        || typeof name !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input.',
        });
        return;
      }
  
      // Call the service function
      const updatedDegree = await degreeController.updateDegree(id, name, totalCredits);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Degree updated successfully.',
        degree: updatedDegree,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Degree with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /degree/update';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.get('/degree/delete', async (req: Request, res: Response) => {
    const { id } = req.query;
  
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id as a string.',
        });
        return;
      }
  
      // Call the service function
      const newDegree = await degreeController.deleteDegree(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Degree deleted successfully.',
        degree: newDegree,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Degree with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /degree/delete';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

router.post('/getPools', async (req: Request, res: Response) => {
  const payload = req.body;

  if( ( ! payload ) || ( Object.keys(payload).length < 1 ) ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Degree ID is required to get Course Pools." });

    return;
  }

  if( ! payload.degree_id ) {
    res.status(HTTP.BAD_REQUEST).json
    ({ error: "Payload attributes cannot be empty" });

    return;
  }

  const { degree_id } = payload;

  try {
    const result = await DegreeXCPController.getAllDegreeXCP(degree_id);

    if( (result) && (result.course_pools.length > 0) ) {
      const { course_pools }      = result;
      let degree_coursepools: any = {};

      for(let i = 0; i < course_pools.length; i++) {
        const { id, name } = course_pools[i];
        const pools        = Object.keys(degree_coursepools);

        if( ! pools.find( item => name === item ) ) {
          degree_coursepools[name] = [];
        }

        const courses_in_pool = await CourseXCPController.getAllCourseXCP(id); 

        if( courses_in_pool ) {
          degree_coursepools[name] = courses_in_pool.course_codes;
        }
      }

      res.status(HTTP.OK).json(degree_coursepools);
    }
    else {
      res.status(HTTP.NOT_FOUND).json({ error: "No coursepools found" });
    }
  } 
  catch ( error ) {
    console.error("Error in /degree/getPools", error);
    res.status(HTTP.SERVER_ERR).json
    ({ error: "Coursepools could not be fetched" });
  }
});
  
  export default router;