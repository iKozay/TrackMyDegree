import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import {
  courseController,
  degreeController,
  coursepoolController,
} from '@controllers/mondoDBControllers';

const router = express.Router();
const INTERNAL_SERVER_ERROR = 'Internal server error';

// ==========================
// COURSE ROUTES (READ ONLY)
// ==========================

/**
 * GET /courses - Get all courses
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { pool, search, page, limit, sort } = req.query;

    const courses = await courseController.getAllCourses({
      pool: pool as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort: sort as string,
    });

    res.status(HTTP.OK).json(courses);
  } catch (error) {
    console.error('Error in GET /courses', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /courses/by-degree/:degreeId - Get courses grouped by pools for a degree
 */
router.get('/by-degree/:degreeId', async (req: Request, res: Response) => {
  try {
    const { degreeId } = req.params;

    if (!degreeId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Degree ID is required',
      });
      return;
    }

    // Get course pool IDs for the degree
    const coursePoolIds =
      await degreeController.getCoursePoolsForDegree(degreeId);

    // Fetch full course pool objects for each ID
    const coursePools = await Promise.all(
      coursePoolIds.map((poolId) =>
        coursepoolController.getCoursePool(poolId).catch(() => null),
      ),
    );

    res.status(HTTP.OK).json(coursePools);
  } catch (error) {
    console.error('Error in GET /courses/by-degree/:degreeId', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /courses/:code - Get course by code
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Course code is required',
      });
      return;
    }

    const course = await courseController.getCourseByCode(code);
    res.status(HTTP.OK).json(course);
  } catch (error) {
    console.error('Error in GET /courses/:code', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

export default router;
