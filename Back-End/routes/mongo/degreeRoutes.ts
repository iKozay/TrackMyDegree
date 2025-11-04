import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { degreeController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// DEGREE ROUTES (READ ONLY)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const DEGREE_ID_REQUIRED = 'Degree ID is required';
const DOES_NOT_EXIST = 'does not exist';

/**
 * GET /degree/:id - Get degree by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: DEGREE_ID_REQUIRED,
      });
      return;
    }

    const degree = await degreeController.readDegree(id);
    res.status(HTTP.OK).json(degree);
  } catch (error) {
    console.error('Error in GET /degree/:id', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * GET /degree - Get all degrees
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const degrees = await degreeController.readAllDegrees();
    res.status(HTTP.OK).json(degrees);
  } catch (error) {
    console.error('Error in GET /degree', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
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
        error: DEGREE_ID_REQUIRED,
      });
      return;
    }

    const credits = await degreeController.getCreditsForDegree(id);
    res.status(HTTP.OK).json({
      totalCredits: credits,
    });
  } catch (error) {
    console.error('Error in GET /degree/:id/credits', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * GET /degree/:id/coursepools - Get course pools for degree
 */
router.get('/:id/coursepools', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: DEGREE_ID_REQUIRED,
      });
      return;
    }

    const coursePools = await degreeController.getCoursePoolsForDegree(id);
    res.status(HTTP.OK).json(coursePools);
  } catch (error) {
    console.error('Error in GET /degree/:id/coursepools', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

export default router;
