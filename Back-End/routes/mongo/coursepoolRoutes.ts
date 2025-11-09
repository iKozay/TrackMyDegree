import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { coursepoolController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// COURSE POOL ROUTES
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';

/**
 * @openapi
 * tags:
 *   - name: CoursePools (v2)
 *     description: Mongo-backed course pool endpoints (v2)
 */

/**
 * GET /coursepool/:id - Get course pool by ID
 */
/**
 * @openapi
 * /v2/coursepool/{id}:
 *   get:
 *     summary: Get a course pool by ID
 *     tags: [CoursePools (v2)]
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const coursePool = await coursepoolController.getCoursePool(req.params.id);
    if (!coursePool) {
      return res
        .status(HTTP.NOT_FOUND)
        .json({ error: 'Course pool not found' });
    }
    return res.status(HTTP.OK).json(coursePool);
  } catch (error) {
    console.error('Error fetching course pool:', error);
    return res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /coursepool/ - Get all course pools
 */
/**
 * @openapi
 * /v2/coursepool:
 *   get:
 *     summary: List all course pools
 *     tags: [CoursePools (v2)]
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const coursePools = await coursepoolController.getAllCoursePools();
    return res.status(HTTP.OK).json(coursePools);
  } catch (error) {
    console.error('Error fetching course pools:', error);
    return res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
