import HTTP from "@Util/HTTPCodes";
import express, { Request, Response } from "express";
import exemptionController from "@controllers/exemptionController/exemptionController";

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
    const { id, coursecode, user_id } = req.body;
  
    try {
      // Validate input
      if (!id || !coursecode || typeof user_id !== 'string' || typeof id !== 'string' 
            || typeof coursecode !== 'string') {

        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input. Please provide id, coursecode, and user_id as a string.',
        });
        return;
      }
  
      // Call the service function
      const newExemption = await exemptionController.createExemption(id, coursecode, user_id);
  
      // Send success response
      res.status(HTTP.CREATED).json({
        message: 'Exemption created successfully.',
        exemption: newExemption,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Exemption with this id already exists.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /exemption/create';
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
      const newExemption = await exemptionController.readExemption(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Exemption read successfully.',
        exemption: newExemption,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Exemption with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /exemption/read';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.post('/update', async (req: Request, res: Response) => {
    const { id, coursecode, user_id } = req.body;
  
    try {
      // Validate input
      if (!id || !coursecode || typeof user_id !== 'string' || typeof id !== 'string' 
        || typeof coursecode !== 'string') {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Invalid input.',
        });
        return;
      }
  
      // Call the service function
      const updatedExemption = await exemptionController.updateExemption(id, coursecode, user_id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Exemption updated successfully.',
        exemption: updatedExemption,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Exemption with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /exemption/update';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });

  router.put('/delete', async (req: Request, res: Response) => {
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
      const newExemption = await exemptionController.deleteExemption(id);
  
      // Send success response
      res.status(HTTP.OK).json({
        message: 'Exemption deleted successfully.',
        exemption: newExemption,
      });
    } catch (error) {
      // Handle errors from the service
      if (error instanceof Error && error.message === 'Exemption with this id does not exist.') {
        res.status(HTTP.FORBIDDEN).json({ error: error.message });
      } else {
        const errMsg = 'Internal server error in /exemption/delete';
        console.error(errMsg, error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
      }
    }
  });
  
  export default router;