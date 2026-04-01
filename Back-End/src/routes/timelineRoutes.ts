import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { timelineController } from '@controllers/timelineController';
import { assignJobId, RequestWithJobId } from '@middleware/assignJobId';
import { queue } from '../workers/queue';
import mongoose from 'mongoose';
import { getJobResult } from '../lib/cache';
import { TimelineResult } from '@trackmydegree/shared';
import { BadRequestError, NotFoundError } from '@utils/errors';

const router = express.Router();

// ==========================
// TIMELINE ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const INVALID_ID_FORMAT = 'Invalid user id format';
const DOES_NOT_EXIST = 'does not exist';

/**
 * @openapi
 * tags:
 *   - name: Timelines
 *     description: Mongo-backed timeline endpoints
 */

/**
 * POST /timeline - Save timeline
 */
/**
 * @openapi
 * /timeline:
 *   post:
 *     summary: Save a timeline
 *     description: Creates or saves a user's timeline.
 *     tags: [Timelines]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               timelineName: { type: string }
 *               jobId: { type: string }
 *             required: [userId, timelineName, jobId]
 *     responses:
 *       201:
 *         description: Timeline saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 timeline:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */

router.post('/', async (req: Request, res: Response) => {
  const { userId, timelineName, jobId } = req.body;

  if (!userId || !timelineName || !jobId) {
    throw new BadRequestError('User ID, timeline name, and job ID are required');
  }

  // get result from cache
  const cached = await getJobResult<TimelineResult>(jobId);
  if (!cached) {
    throw new NotFoundError('Timeline data not found for the provided job ID');
  }

  const cachedTimeline = cached.payload.data;
  const timeline = await timelineController.saveTimeline(userId, timelineName, cachedTimeline);
  res.status(HTTP.CREATED).json(timeline);
});

/**
 * GET /timeline/:id - Get timeline by ID
 */
/**
 * @openapi
 * /timeline/{id}:
 *   get:
 *     summary: Get timeline by ID
 *     tags: [Timelines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Timeline retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 timeline:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Timeline ID is required
 *       404:
 *         description: Timeline not found
 *       500:
 *         description: Internal server error
 */
// routes/timeline.ts
router.get('/:id', assignJobId, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { jobId } = req as RequestWithJobId;

     if (!mongoose.Types.ObjectId.isValid(id as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    if (!jobId) {
      throw new Error("Job ID wasn't assigned to the request by middleware");
    }

      await queue.add('processData', {
        jobId,
        kind: 'timelineData',
        timelineId: id as string,
      });

    res.status(HTTP.ACCEPTED).json({
      jobId,
      status: 'processing',
    });
});

/**
 * PUT /timeline/:id - Update timeline
 */
/**
 * @openapi
 * /timeline/{id}:
 *   put:
 *     summary: Update a timeline
 *     tags: [Timelines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Timeline updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 timeline:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Timeline ID is required
 *       404:
 *         description: Timeline not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const timeline = await timelineController.updateTimeline(id as string, updates);
    res.status(HTTP.OK).json(timeline);
});

/**
 * DELETE /timeline/:id - Delete timeline
 */
/**
 * @openapi
 * /timeline/{id}:
 *   delete:
 *     summary: Delete a timeline
 *     tags: [Timelines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       400:
 *         description: Timeline ID is required
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

   if (!mongoose.Types.ObjectId.isValid(id as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const result = await timelineController.deleteTimeline(id as string);
    res.status(HTTP.OK).json(result);
});

/**
 * DELETE /timeline/user/:userId - Delete all timelines for user
 */
/**
 * @openapi
 * /timeline/user/{userId}:
 *   delete:
 *     summary: Delete all timelines for a user
 *     tags: [Timelines]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted all timelines for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 deletedCount: { type: integer }
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Internal server error
 */
router.delete('/user/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const count = await timelineController.deleteAllUserTimelines(userId as string);
    res.status(HTTP.OK).json({
      message: `Deleted ${count} timelines for user`,
    });
});

export default router;
