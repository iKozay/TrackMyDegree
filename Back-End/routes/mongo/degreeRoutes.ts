/**
 * Degree Routes
 * 
 * Handles degree operations
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { degreeController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// DEGREE ROUTES
// ==========================

/**
 * GET /degree/:id - Get degree by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Degree ID is required',
      });
      return;
    }

    const degree = await degreeController.readDegree(id);
    res.status(HTTP.OK).json({
      message: 'Degree retrieved successfully',
      degree,
    });
  } catch (error) {
    console.error('Error in GET /degree/:id', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /degree - Get all degrees
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const degrees = await degreeController.readAllDegrees();
    res.status(HTTP.OK).json({
      message: 'Degrees retrieved successfully',
      degrees,
    });
  } catch (error) {
    console.error('Error in GET /degree', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
  }
});

/**
 * GET /degree/:id/credits - Get credits for degree
 */
router.get('/:id/credits', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Degree ID is required',
      });
      return;
    }

    const credits = await degreeController.getCreditsForDegree(id);
    res.status(HTTP.OK).json({
      message: 'Credits retrieved successfully',
      totalCredits: credits,
    });
  } catch (error) {
    console.error('Error in GET /degree/:id/credits', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  }
});


export default router;
