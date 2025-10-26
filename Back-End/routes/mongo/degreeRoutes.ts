/**
 * Degree Routes
 * 
 * Handles degree, course pool, and degree-course pool operations
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

// ==========================
// COURSE POOL ROUTES
// ==========================

/**
 * GET /course-pools - Get all course pools
 */
router.get('/course-pools', async (req: Request, res: Response) => {
  try {
    const coursePools = await degreeController.getAllCoursePools();
    res.status(HTTP.OK).json({
      message: 'Course pools retrieved successfully',
      coursePools,
    });
  } catch (error) {
    console.error('Error in GET /course-pools', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
  }
});

/**
 * GET /course-pools/:id - Get course pool by ID
 */
router.get('/course-pools/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Course pool ID is required',
      });
      return;
    }

    const coursePool = await degreeController.getCoursePool(id);

    if (!coursePool) {
      res.status(HTTP.NOT_FOUND).json({ error: 'Course pool not found' });
      return;
    }

    res.status(HTTP.OK).json({
      message: 'Course pool retrieved successfully',
      coursePool,
    });
  } catch (error) {
    console.error('Error in GET /course-pools/:id', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
  }
});

/**
 * GET /degree/:degreeId/course-pools - Get course pools for degree
 */
router.get(
  '/:degreeId/course-pools',
  async (req: Request, res: Response) => {
    try {
      const { degreeId } = req.params;

      if (!degreeId) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Degree ID is required',
        });
        return;
      }

      const coursePools =
        await degreeController.getCoursePoolsByDegree(degreeId);
      res.status(HTTP.OK).json({
        message: 'Course pools retrieved successfully',
        coursePools,
      });
    } catch (error) {
      console.error('Error in GET /degree/:degreeId/course-pools', error);
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  },
);

export default router;
