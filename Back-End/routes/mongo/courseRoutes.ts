/**
 * Course Routes
 * 
 * Handles course and requisite operations
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

/**
 * GET /courses/pool/:poolName - Get courses by pool
 */
router.get('/pool/:poolName', async (req: Request, res: Response) => {
  try {
    const { poolName } = req.params;

    if (!poolName) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Pool name is required',
      });
      return;
    }

    const courses = await courseController.getCoursesByPool(poolName);
    res.status(HTTP.OK).json({
      message: 'Courses retrieved successfully',
      courses,
    });
  } catch (error) {
    console.error('Error in GET /courses/pool/:poolName', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
  }
});

// ==========================
// REQUISITE ROUTES
// ==========================

/**
 * POST /courses/:code1/requisites - Create requisite
 */
router.post(
  '/:code1/requisites',
  async (req: Request, res: Response) => {
    try {
      const { code1 } = req.params;
      const { code2, type } = req.body;

      if (!code1 || !code2 || !type) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course codes and type are required',
        });
        return;
      }

      if (!['pre', 'co'].includes(type)) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Type must be "pre" or "co"',
        });
        return;
      }

      const requisite = await courseController.createRequisite(
        code1,
        code2,
        type,
      );
      res.status(HTTP.CREATED).json({
        message: 'Requisite created successfully',
        requisite,
      });
    } catch (error) {
      console.error('Error in POST /courses/:code1/requisites', error);
      if (error instanceof Error && error.message.includes('not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else if (
        error instanceof Error &&
        error.message.includes('already exists')
      ) {
        res.status(HTTP.CONFLICT).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * GET /courses/:code1/requisites - Get requisites for course
 */
router.get(
  '/:code1/requisites',
  async (req: Request, res: Response) => {
    try {
      const { code1 } = req.params;

      if (!code1) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course code is required',
        });
        return;
      }

      const requisites = await courseController.getRequisites(code1);
      res.status(HTTP.OK).json({
        message: 'Requisites retrieved successfully',
        requisites,
      });
    } catch (error) {
      console.error('Error in GET /courses/:code1/requisites', error);
      if (error instanceof Error && error.message.includes('not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * DELETE /courses/:code1/requisites - Delete requisite
 */
router.delete(
  '/:code1/requisites',
  async (req: Request, res: Response) => {
    try {
      const { code1 } = req.params;
      const { code2, type } = req.body;

      if (!code1 || !code2 || !type) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course codes and type are required',
        });
        return;
      }

      if (!['pre', 'co'].includes(type)) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Type must be "pre" or "co"',
        });
        return;
      }

      const message = await courseController.deleteRequisite(
        code1,
        code2,
        type,
      );
      res.status(HTTP.OK).json({
        message,
      });
    } catch (error) {
      console.error('Error in DELETE /courses/:code1/requisites', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

export default router;
