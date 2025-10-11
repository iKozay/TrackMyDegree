import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import requisiteController from '@controllers/requisiteController/requisiteController';
import RequisiteTypes from '@controllers/requisiteController/requisite_types';

const router = express.Router();

router.post('/create', async (req: Request, res: Response) => {
  const { code1, code2, type } = req.body as {
    code1: string;
    code2: string;
    type: RequisiteTypes.RequisiteType;
  };
  try {
    // Validate input
    if (!code1 || !code2 || !type) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Invalid input. Please provide code1, and code2 as a string.',
      });
      return;
    }

    // Call the service function
    const newRequisite = await requisiteController.createRequisite(
      code1,
      code2,
      type,
    );

    // Send success response
    res.status(HTTP.CREATED).json({
      message: 'Requisite created successfully.',
      requisite: newRequisite,
    });
  } catch (error) {
    // Handle errors from the service
    if (
      error instanceof Error &&
      error.message === 'Requisite with this id already exists.'
    ) {
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /requisite/create';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

router.post('/read', async (req: Request, res: Response) => {
  const { code1, code2, type } = req.body as {
    code1: string;
    code2?: string;
    type?: RequisiteTypes.RequisiteType;
  };

  try {
    // Validate input
    if (!code1) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Invalid input. Please provide code1 as a string.',
      });
      return;
    }

    // Call the service function
    const requisites = await requisiteController.readRequisite(
      code1,
      code2,
      type,
    );

    // Send success response
    res.status(HTTP.OK).json({
      message: 'Requisites read successfully.',
      requisites, // Return the array of requisites
    });
  } catch (error) {
    // Handle errors from the service
    if (
      error instanceof Error &&
      error.message ===
        'The course combination or type provided does not exist.'
    ) {
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /requisite/read';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

router.post('/update', async (req: Request, res: Response) => {
  const { code1, code2, type } = req.body as {
    code1: string;
    code2: string;
    type: RequisiteTypes.RequisiteType;
  };

  try {
    // Validate input
    if (!code1 || !code2 || !type) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Invalid input.',
      });
      return;
    }

    // Call the service function
    const updatedRequisite = await requisiteController.updateRequisite(
      code1,
      code2,
      type,
    );

    // Send success response
    res.status(HTTP.OK).json({
      message: 'Requisite updated successfully.',
      requisite: updatedRequisite,
    });
  } catch (error) {
    // Handle errors from the service
    if (
      error instanceof Error &&
      error.message === 'Requisite with this course combination does not exist.'
    ) {
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /requisite/update';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

router.post('/delete', async (req: Request, res: Response) => {
  const { code1, code2, type } = req.body;

  try {
    // Validate input
    if (!code1 || !code2 || !type) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Invalid input.',
      });
      return;
    }

    // Call the service function
    await requisiteController.deleteRequisite(code1, code2, type);

    // Send success response
    res.status(HTTP.OK).json({
      message: 'Requisite deleted successfully.',
    });
  } catch (error) {
    // Handle errors from the service
    if (
      error instanceof Error &&
      error.message === 'Requisite with this course combination does not exist.'
    ) {
      res.status(HTTP.FORBIDDEN).json({ error: error.message });
    } else {
      const errMsg = 'Internal server error in /requisite/delete';
      console.error(errMsg, error);
      res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
  }
});

export default router;
