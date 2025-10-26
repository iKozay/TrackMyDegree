/**
 * CourseXCP Routes
 *
 * Handles course-course pool mapping operations
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { courseXCPController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// COURSEXCP ROUTES
// ==========================

/**
 * POST /course-pools/:poolId/courses - Add course to course pool
 */
router.post(
  '/course-pools/:poolId/courses',
  async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const { coursecode } = req.body;

      if (!poolId || !coursecode) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course pool ID and course code are required',
        });
        return;
      }

      const success = await courseXCPController.createCourseXCP(
        coursecode,
        poolId,
      );

      if (success) {
        res.status(HTTP.CREATED).json({
          message: 'Course added to pool successfully',
        });
      } else {
        res.status(HTTP.NOT_FOUND).json({
          error: 'Course pool not found or course already exists',
        });
      }
    } catch (error) {
      console.error('Error in POST /course-pools/:poolId/courses', error);
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /course-pools/:poolId/courses - Get all courses in a course pool
 */
router.get(
  '/course-pools/:poolId/courses',
  async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;

      if (!poolId) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course pool ID is required',
        });
        return;
      }

      const courses = await courseXCPController.getAllCourseXCP(poolId);

      if (courses.length > 0) {
        res.status(HTTP.OK).json({
          message: 'Courses retrieved successfully',
          courses,
        });
      } else {
        res.status(HTTP.NOT_FOUND).json({
          error: 'Course pool not found or empty',
        });
      }
    } catch (error) {
      console.error('Error in GET /course-pools/:poolId/courses', error);
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  },
);

/**
 * DELETE /course-pools/:poolId/courses - Remove course from course pool
 */
router.delete(
  '/course-pools/:poolId/courses',
  async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const { coursecode } = req.body;

      if (!poolId || !coursecode) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course pool ID and course code are required',
        });
        return;
      }

      const success = await courseXCPController.removeCourseXCP(
        coursecode,
        poolId,
      );

      if (success) {
        res.status(HTTP.OK).json({
          message: 'Course removed from pool successfully',
        });
      } else {
        res.status(HTTP.NOT_FOUND).json({
          error: 'Course or course pool not found',
        });
      }
    } catch (error) {
      console.error('Error in DELETE /course-pools/:poolId/courses', error);
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /course-pools/:poolId/courses/check/:coursecode - Check if course exists in pool
 */
router.get(
  '/course-pools/:poolId/courses/check/:coursecode',
  async (req: Request, res: Response) => {
    try {
      const { poolId, coursecode } = req.params;

      if (!poolId || !coursecode) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course pool ID and course code are required',
        });
        return;
      }

      const exists = await courseXCPController.courseExistsInPool(
        coursecode,
        poolId,
      );

      res.status(HTTP.OK).json({
        message: 'Course existence checked successfully',
        exists,
      });
    } catch (error) {
      console.error(
        'Error in GET /course-pools/:poolId/courses/check/:coursecode',
        error,
      );
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /course-pools/:poolId/courses/bulk - Bulk add courses to pool
 */
router.post(
  '/course-pools/:poolId/courses/bulk',
  async (req: Request, res: Response) => {
    try {
      const { poolId } = req.params;
      const { coursecodes } = req.body;

      if (!poolId || !Array.isArray(coursecodes)) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'Course pool ID and course codes array are required',
        });
        return;
      }

      const added = await courseXCPController.bulkCreateCourseXCP(
        coursecodes,
        poolId,
      );

      res.status(HTTP.CREATED).json({
        message: 'Courses added to pool successfully',
        added,
      });
    } catch (error) {
      console.error('Error in POST /course-pools/:poolId/courses/bulk', error);
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  },
);

export default router;
