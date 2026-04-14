import HTTP from '@utils/httpCodes';
import express, { NextFunction, Request, Response } from 'express';
import { degreeController } from '@controllers/degreeController';

import { cacheGET } from '@middleware/cacheGet';
import { BadRequestError } from '@utils/errors';

const router = express.Router();

// ==========================
// DEGREE ROUTES (READ ONLY)
// ==========================

const DEGREE_ID_REQUIRED = 'Degree ID is required';

//Cache Time To Live
const DEGREE_CACHE_TTL = 1800; // 30 minutes

/**
 * @openapi
 * tags:
 *   - name: Degrees
 *     description: Mongo-backed degree endpoints
 */

/**
 * GET /degree/:id - Get degree by ID
 */
/**
 * @openapi
 * /degree/{id}:
 *   get:
 *     summary: Get degree by ID
 *     description: Retrieves degree information for the specified degree ID.
 *     tags: [Degrees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the degree.
 *     responses:
 *       200:
 *         description: Degree retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 degree:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Degree ID missing.
 *       404:
 *         description: Degree does not exist.
 *       500:
 *         description: Internal server error.
 */
router.get(
  '/:id',
  cacheGET(DEGREE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const academicYear = req.query.academicYear as string | undefined;

      const cleanId = (id as string)?.trim();
      if (!cleanId) {
        throw new BadRequestError(DEGREE_ID_REQUIRED);
      }

      const degree = await degreeController.readDegree(
        id as string,
        academicYear,
      );
      res.status(HTTP.OK).json(degree);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /degree - Get all degrees
 */
/**
 * @openapi
 * /degree:
 *   get:
 *     summary: Get all degrees
 *     description: Retrieves a list of all available degree programs.
 *     tags: [Degrees]
 *     responses:
 *       200:
 *         description: Degrees retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 degrees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       500:
 *         description: Internal server error.
 */
router.get(
  '/',
  cacheGET(DEGREE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const academicYear = req.query.academicYear as string | undefined;
      const degrees = await degreeController.readAllDegrees(academicYear);
      res.status(HTTP.OK).json(degrees);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /degree/:id/credits - Get credits for degree
 */
/**
 * @openapi
 * /degree/{id}/credits:
 *   get:
 *     summary: Get total credits for a degree
 *     description: Retrieves the total number of credits required for a specific degree.
 *     tags: [Degrees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the degree.
 *     responses:
 *       200:
 *         description: Credits retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 totalCredits:
 *                   type: number
 *       400:
 *         description: Degree ID missing.
 *       404:
 *         description: Degree does not exist.
 *       500:
 *         description: Internal server error.
 */
router.get(
  '/:id/credits',
  cacheGET(DEGREE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const academicYear = req.query.academicYear as string | undefined;

      const cleanId = (id as string)?.trim();
      if (!cleanId) {
        throw new BadRequestError(DEGREE_ID_REQUIRED);
      }

      const credits = await degreeController.getCreditsForDegree(
        id as string,
        academicYear,
      );
      res.status(HTTP.OK).json({
        totalCredits: credits,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /degree/:id/coursepools - Get course pools for degree
 */
/**
 * @openapi
 * /degree/{id}/coursepools:
 *   get:
 *     summary: Get course pools for a degree
 *     description: Retrieves all course pools associated with a given degree.
 *     tags: [Degrees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the degree.
 *     responses:
 *       200:
 *         description: Course pools retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 coursePools:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: Degree ID missing.
 *       404:
 *         description: Degree does not exist.
 *       500:
 *         description: Internal server error.
 */
router.get(
  '/:id/coursepools',
  cacheGET(DEGREE_CACHE_TTL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const academicYear = req.query.academicYear as string | undefined;
      const cleanId = (id as string)?.trim();
      if (!cleanId) {
        throw new BadRequestError(DEGREE_ID_REQUIRED);
      }

      const coursePools = await degreeController.getCoursePoolsForDegree(
        id as string,
        academicYear,
      );
      res.status(HTTP.OK).json(coursePools);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
