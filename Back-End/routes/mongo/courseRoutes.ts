/**
 * Course Routes
 *
 * Handles course operations (read-only)
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { courseController } from '@controllers/mondoDBControllers';

const router = express.Router();

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

    res.status(HTTP.OK).json({
      message: 'Courses retrieved successfully',
      courses,
    });
  } catch (error) {
    console.error('Error in GET /courses', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
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
    res.status(HTTP.OK).json({
      message: 'Course retrieved successfully',
      course,
    });
  } catch (error) {
    console.error('Error in GET /courses/:code', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  }
});

export default router;
