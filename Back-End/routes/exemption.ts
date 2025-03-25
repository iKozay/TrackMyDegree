import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import exemptionController from '@controllers/exemptionController/exemptionController';

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  const { coursecodes, user_id } = req.body;

  try {
    // Validate input
    if (
      !Array.isArray(coursecodes) ||
      coursecodes.some((cc) => typeof cc !== 'string') ||
      typeof user_id !== 'string'
    ) {
      res.status(HTTP.BAD_REQUEST).json({
        error:
          'Invalid input. Please provide an array of course codes and a user_id as a string.',
      });
      return;
    }

    // Call the service function
    const result = await exemptionController.createExemptions(
      coursecodes,
      user_id,
    );

    // Compose a success message
    let message = 'Exemptions created successfully.';
    if (result.alreadyExists.length > 0) {
      message += ` Exemptions for the following course codes already existed: ${result.alreadyExists.join(', ')}.`;
    }

    // Send success response
    res.status(HTTP.CREATED).json({
      message,
      exemptions: result.created,
    });
  } catch (error) {
    // Handle errors from the service
    if (error instanceof Error) {
      console.error('ERROR: ', error.message);
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /exemption/create';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

router.post('/getAll', async (req: Request, res: Response) => {
  const { user_id } = req.body;

  try {
    // Validate input
    if (!user_id || typeof user_id !== 'string') {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Invalid input. Please provide user_id as a string.',
      });
      return;
    }

    // Call the service function
    const newExemption =
      await exemptionController.getAllExemptionsByUser(user_id);

    // Send success response
    res.status(HTTP.OK).json({
      message: 'Exemption read successfully.',
      exemption: newExemption,
    });
  } catch (error) {
    // Handle errors from the service
    if (error instanceof Error) {
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /exemption/getAll';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

router.post('/delete', async (req: Request, res: Response) => {
  const { coursecode, user_id } = req.body;

  try {
    // Validate input
    if (
      !coursecode ||
      typeof coursecode !== 'string' ||
      !user_id ||
      typeof user_id !== 'string'
    ) {
      res.status(HTTP.BAD_REQUEST).json({
        error:
          'Invalid input. Please provide coursecode and user_id as strings.',
      });
      return;
    }

    // Call the service function
    await exemptionController.deleteExemptionByCoursecodeAndUserId(
      coursecode,
      user_id,
    );

    // Send success response
    res.status(HTTP.OK).json({
      message: 'Exemption deleted successfully.',
    });
  } catch (error) {
    // Handle errors from the service
    if (error instanceof Error) {
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /exemption/delete';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

export default router;
