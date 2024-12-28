import HTTP from "@Util/HTTPCodes";
import express, { Request, Response } from "express";
import CRUDController from "@controllers/CRUDController/CRUDController";
import CRUD from "@controllers/CRUDController/CRUD_types"

const router = express.Router();

router.post('/degree/create', async (req: Request, res: Response) => {
    const { id, name, totalCredits } = req.body;
  
    try {
      // Validate input
      if (!id || !name || typeof totalCredits !== 'number') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id, name, and totalCredits as a number.',
        });
        return;
      }
  
      // Call the service function
      const newDegree = await CRUDController.createDegree(id, name, totalCredits);
  
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
      const newDegree = await CRUDController.readDegree(id);
  
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
  
  export default router;