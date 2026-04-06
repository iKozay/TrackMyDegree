import HTTP from '@utils/httpCodes';
import express, { NextFunction, Request, Response } from 'express';
import { coursepoolController } from '@controllers/coursepoolController';
import { cacheGET } from '@middleware/cacheGet';
import { BadRequestError } from '@utils/errors';

const router = express.Router();

// ==========================
// COURSE POOL ROUTES
// ==========================

const COURSEPOOL_CACHE_TTL = 1800; // 30 minutes

/**
 * @openapi
 * tags:
 *   - name: CoursePools
 *     description: Mongo-backed course pool endpoints
 */

/**
 * GET /coursepool/:id - Get course pool by ID
 */
/**
 * @openapi
 * /coursepool/{id}:
 *   get:
 *     summary: Get a course pool by ID
 *     tags: [CoursePools]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Course pool identifier
 *     responses:
 *       200:
 *         description: Course pool found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       404:
 *         description: Course pool not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  cacheGET(COURSEPOOL_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id  = req.params.id as string;
      const academicYear = req.query.academicYear as string | undefined;
      if (!id || id.trim() === '') {
        throw new BadRequestError('Course pool ID is required');
      }

      const coursePool = await coursepoolController.getCoursePool(
        id,
        academicYear,
      );

      return res.status(HTTP.OK).json(coursePool);
    } catch (error) {
      next(error)
    }
  },
);

/**
 * GET /coursepool/ - Get all course pools
 */
/**
 * @openapi
 * /coursepool:
 *   get:
 *     summary: List all course pools
 *     tags: [CoursePools]
 *     responses:
 *       200:
 *         description: Array of course pools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 additionalProperties: true
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  cacheGET(COURSEPOOL_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {

      const academicYear = req.query.academicYear as string | undefined;
      const coursePools =
        await coursepoolController.getAllCoursePools(academicYear);
      return res.status(HTTP.OK).json(coursePools);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
