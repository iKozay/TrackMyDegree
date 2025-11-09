import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import {
  courseController,
  coursepoolController,
  degreeController,
} from '@controllers';

const router = express.Router();
const INTERNAL_SERVER_ERROR = 'Internal server error';

// ==========================
// COURSE ROUTES (READ ONLY)
// ==========================

/**
 * @openapi
 * tags:
 *   - name: Courses
 *     description: Mongo-backed course endpoints
 */

/**
 * GET /courses - Get all courses
 */
/**
 * @openapi
 * /courses:
 *   get:
 *     summary: Get all courses
 *     description: Returns all courses with optional filtering, search, pagination, and sorting.
 *     tags: [Courses]
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
      coursePoolIds.map(async (poolId) => {
        const coursePool = await coursepoolController
          .getCoursePool(poolId)
          .catch(() => null);
        const courseIds = coursePool?.courses;
        const courses = courseIds
          ? await Promise.all(
              courseIds.map(async (courseId) => {
                try {
                  return await courseController.getCourseByCode(courseId);
                } catch {
                  return null;
                }
              }),
            )
          : [];
        return {
          _id: coursePool?._id,
          name: coursePool?.name,
          creditsRequired: coursePool?.creditsRequired,
          courses: courses.filter((course) => course !== null),
        };
      }),
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
/**
 * @openapi
 * /courses/{code}:
 *   get:
 *     summary: Get course by code
 *     description: Retrieves details for a specific course by its unique course code.
 *     tags: [Courses]
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
