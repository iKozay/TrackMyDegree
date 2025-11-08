/**
 * Timeline Routes
 *
 * Handles timeline CRUD operations
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { timelineController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// TIMELINE ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const TIMELINE_ID_REQUIRED = 'Timeline ID is required';

/**
 * @openapi
 * tags:
 *   - name: Timelines (v2)
 *     description: Mongo-backed timeline endpoints (v2)
 */

/**
 * POST /timeline - Save timeline
 */
/**
 * @openapi
 * /v2/timeline:
 *   post:
 *     summary: Save a timeline
 *     description: Creates or saves a user's timeline.
 *     tags: [Timelines (v2)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id: { type: string }
 *               name: { type: string }
 *               degree_id: { type: string }
 *             required: [user_id, name, degree_id]
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
  try {
    const timelineData = req.body;

    if (
      !timelineData.user_id ||
      !timelineData.name ||
      !timelineData.degree_id
    ) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID, timeline name, and degree ID are required',
      });
      return;
    }

    const timeline = await timelineController.saveTimeline(timelineData);
    res.status(HTTP.CREATED).json({
      message: 'Timeline saved successfully',
      timeline,
    });
  } catch (error) {
    console.error('Error in POST /timeline', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /timeline/user/:userId - Get timelines for user
 */
/**
 * @openapi
 * /v2/timeline/user/{userId}:
 *   get:
 *     summary: Get timelines by user ID
 *     tags: [Timelines (v2)]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Timelines retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 timelines:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: User ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID is required',
      });
      return;
    }

    const timelines = await timelineController.getTimelinesByUser(userId);
    res.status(HTTP.OK).json({
      message: 'Timelines retrieved successfully',
      timelines,
    });
  } catch (error) {
    console.error('Error in GET /timeline/user/:userId', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /timeline/:id - Get timeline by ID
 */
/**
 * @openapi
 * /v2/timeline/{id}:
 *   get:
 *     summary: Get timeline by ID
 *     tags: [Timelines (v2)]
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: TIMELINE_ID_REQUIRED,
      });
      return;
    }

    const timeline = await timelineController.getTimelineById(id);
    res.status(HTTP.OK).json({
      message: 'Timeline retrieved successfully',
      timeline,
    });
  } catch (error) {
    console.error('Error in GET /timeline/:id', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * PUT /timeline/:id - Update timeline
 */
/**
 * @openapi
 * /v2/timeline/{id}:
 *   put:
 *     summary: Update a timeline
 *     tags: [Timelines (v2)]
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
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: TIMELINE_ID_REQUIRED,
      });
      return;
    }

    const timeline = await timelineController.updateTimeline(id, updates);
    res.status(HTTP.OK).json({
      message: 'Timeline updated successfully',
      timeline,
    });
  } catch (error) {
    console.error('Error in PUT /timeline/:id', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * DELETE /timeline/:id - Delete timeline
 */
/**
 * @openapi
 * /v2/timeline/{id}:
 *   delete:
 *     summary: Delete a timeline
 *     tags: [Timelines (v2)]
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
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: TIMELINE_ID_REQUIRED,
      });
      return;
    }

    const result = await timelineController.removeUserTimeline(id);
    res.status(HTTP.OK).json(result);
  } catch (error) {
    console.error('Error in DELETE /timeline/:id', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * DELETE /timeline/user/:userId - Delete all timelines for user
 */
/**
 * @openapi
 * /v2/timeline/user/{userId}:
 *   delete:
 *     summary: Delete all timelines for a user
 *     tags: [Timelines (v2)]
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
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID is required',
      });
      return;
    }

    const count = await timelineController.deleteAllUserTimelines(userId);
    res.status(HTTP.OK).json({
      message: `Deleted ${count} timelines for user`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error in DELETE /timeline/user/:userId', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
