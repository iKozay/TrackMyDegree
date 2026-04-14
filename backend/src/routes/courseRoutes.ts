import HTTP from '@utils/httpCodes';
import express, { NextFunction, Request, Response } from 'express';
import { courseController } from '@controllers/courseController';
import { degreeController } from '@controllers/degreeController';

import { cacheGET } from '@middleware/cacheGet';
import { BadRequestError } from '@utils/errors';

const router = express.Router();
// Cache Time To Live
const COURSE_CACHE_TTL = 900; // 15 minutes
const COURSE_BY_DEGREE_CACHE_TTL = 1800; // 30 minutes

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
router.get(
  '/',
  cacheGET(COURSE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pool, search, page, limit, sort, academicYear } = req.query;

        const courses = await courseController.getAllCourses({
          pool: pool as string,
          search: search as string,
          page: page ? Number.parseInt(page as string) : undefined,
          limit: limit ? Number.parseInt(limit as string) : undefined,
          sort: sort as string,
          academicYear: academicYear as string,
        });
        res.status(HTTP.OK).json(courses);
    } catch (error) {
        next(error);
    }
  },
);

router.get('/all-codes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseCodes = await courseController.getAllCourseCodes();
        res.status(HTTP.OK).json({ courseCodes });
    } catch (error) {
        next(error);
    }
});


/**
 * GET /courses/by-degree/:degreeId - Get courses grouped by pools for a degree
 */
router.get(
  '/by-degree/:degreeId',
  cacheGET(COURSE_BY_DEGREE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { degreeId } = req.params;
      const academicYear = req.query.academicYear as string | undefined;
      const cleanDegreeId = `${degreeId ?? ''}`.trim();

      if (!cleanDegreeId) {
       throw new BadRequestError('Degree ID is required');
      }
      const coursePools = await degreeController.getCoursePoolsForDegree(
        cleanDegreeId,
        academicYear,
      );
      const courseIds = [...new Set(coursePools.flatMap((coursePool) => coursePool.courses))];
      const courses = await courseController.getCoursesByCodes(
        courseIds,
        academicYear,
      );
      const coursesById = new Map(
        courses.map((course) => [course._id, course]),
      );

      const populatedPools = coursePools.map((coursePool) => ({
        _id: coursePool._id,
        name: coursePool.name,
        creditsRequired: coursePool.creditsRequired,
        courses: coursePool.courses
          .map((courseId) => coursesById.get(courseId))
          .filter(Boolean),
      }));

      res.status(HTTP.OK).json(populatedPools);
    } catch (error) {
      next(error);
    }
  },
);

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
router.get(
  '/:code',
  cacheGET(COURSE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const academicYear = req.query.academicYear as string | undefined;
      const cleanCode = `${code ?? ''}`.trim();

      if (!cleanCode) {
        throw new BadRequestError('Course code is required');
      }

      const course = await courseController.getCourseByCode(
        cleanCode,
        academicYear,
      );
      res.status(HTTP.OK).json(course);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
