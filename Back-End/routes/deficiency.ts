import HTTP from "@Util/HTTPCodes";
import express, { Request, Response } from "express";
import deficiencyController from "@controllers/deficiencyController/deficiencyController";

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
    const { id, coursepool, user_id, creditsRequired } = req.body
  
    try {
      // Validate input
      if (!id || !coursepool || !user_id || !creditsRequired 
        || typeof coursepool !== 'string' || typeof id !== 'string' 
        || typeof user_id !== 'string' 
        || typeof creditsRequired !== 'number') {

        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id, coursepool, user_id, and creditsRequired in valid format.',
        });
        return;
      }
  
      // Call the service function
      const newDeficiency = await deficiencyController.createDeficiency(id, coursepool, user_id, creditsRequired);
  
      // Send success response
      res.status(HTTP.CREATED).json({
        message: 'Deficiency created successfully.',
        deficiency: newDeficiency,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Deficiency with this id or name already exists.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /deficiency/create';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });
  

  router.get('/read', async (req: Request, res: Response) => {
    const { id } = req.body;
  
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id as a string.',
        });
        return;
      }
  
      // Call the service function
      const newDeficiency = await deficiencyController.readDeficiency(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Deficiency read successfully.',
        deficiency: newDeficiency,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Deficiency with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /deficiency/read';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.put('/update', async (req: Request, res: Response) => {
    const { id, coursepool, user_id, creditsRequired } = req.body;
  
    try {
      // Validate input
      if (!id || !coursepool || !user_id || !creditsRequired 
        || typeof coursepool !== 'string' || typeof id !== 'string' 
        || typeof user_id !== 'string' 
        || typeof creditsRequired !== 'number') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input.',
        });
        return;
      }
  
      // Call the service function
      const updatedDeficiency = await deficiencyController.updateDeficiency(id, coursepool, user_id, creditsRequired);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Deficiency updated successfully.',
        deficiency: updatedDeficiency,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Deficiency with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /deficiency/update';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.post('/delete', async (req: Request, res: Response) => {
    const { id } = req.body;
  
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id as a string.',
        });
        return;
      }
  
      // Call the service function
        await deficiencyController.deleteDeficiency(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Deficiency deleted successfully.',
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Deficiency with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /deficiency/delete';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });
  
  export default router;