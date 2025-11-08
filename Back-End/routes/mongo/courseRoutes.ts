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
 * @openapi
 * tags:
 *   - name: Courses (v2)
 *     description: Mongo-backed course endpoints (v2)
 */

/**
 * GET /courses - Get all courses
 */
/**
 * @openapi
 * /v2/courses:
 *   get:
 *     summary: Get all courses
 *     description: Returns all courses with optional filtering, search, pagination, and sorting.
 *     tags: [Courses (v2)]
 *     parameters:
 *       - in: query
 *         name: pool
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by course pool ID or name.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search keyword for course title or code.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum results per page.
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *         description: Sort order (e.g. 'asc' or 'desc').
 *     responses:
 *       200:
 *         description: Courses retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 courses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       500:
 *         description: Internal server error.
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
/**
 * @openapi
 * /v2/courses/{code}:
 *   get:
 *     summary: Get course by code
 *     description: Retrieves details for a specific course by its unique course code.
 *     tags: [Courses (v2)]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The course code (e.g. 'COMP 248').
 *     responses:
 *       200:
 *         description: Course retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 course:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Missing or invalid course code.
 *       404:
 *         description: Course not found.
 *       500:
 *         description: Internal server error.
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
