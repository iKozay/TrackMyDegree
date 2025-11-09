import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { feedbackController } from '@controllers/feedbackController';

const router = express.Router();

// ==========================
// FEEDBACK ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';

/**
 * @openapi
 * tags:
 *   - name: Feedback
 *     description: Mongo-backed feedback endpoints
 */

/**
 * POST /feedback - Submit feedback
 */
/**
 * @openapi
 * /feedback:
 *   post:
 *     summary: Submit feedback
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string }
 *               user_id: { type: string, nullable: true }
 *             required: [message]
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 feedback:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: "Missing required field: message"
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, user_id } = req.body;

    if (!message) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Missing required field: message',
      });
      return;
    }

    const feedback = await feedbackController.submitFeedback(message, user_id);
    res.status(HTTP.CREATED).json({
      message: 'Feedback submitted successfully',
      feedback,
    });
  } catch (error) {
    console.error('Error in POST /feedback', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /feedback - Get all feedback
 */
/**
 * @openapi
 * /feedback:
 *   get:
 *     summary: Get all feedback
 *     description: Returns feedback with optional filtering by user and pagination/sorting.
 *     tags: [Feedback]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *         required: false
 *         description: Filter feedback by user ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1 }
 *         required: false
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [asc, desc] }
 *         required: false
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 feedback:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { user_id, page, limit, sort } = req.query;

    const feedback = await feedbackController.getAllFeedback({
      user_id: user_id as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sort: sort as 'asc' | 'desc',
    });

    res.status(HTTP.OK).json({
      message: 'Feedback retrieved successfully',
      feedback,
    });
  } catch (error) {
    console.error('Error in GET /feedback', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * GET /feedback/:id - Get feedback by ID
 */
/**
 * @openapi
 * /feedback/{id}:
 *   get:
 *     summary: Get feedback by ID
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 feedback:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: Feedback ID is required
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Feedback ID is required',
      });
      return;
    }

    const feedback = await feedbackController.getFeedbackById(id);
    res.status(HTTP.OK).json({
      message: 'Feedback retrieved successfully',
      feedback,
    });
  } catch (error) {
    console.error('Error in GET /feedback/:id', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * DELETE /feedback/:id - Delete feedback
 */
/**
 * @openapi
 * /feedback/{id}:
 *   delete:
 *     summary: Delete feedback by ID
 *     tags: [Feedback]
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
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Feedback ID is required
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Feedback ID is required',
      });
      return;
    }

    const message = await feedbackController.deleteFeedback(id);
    res.status(HTTP.OK).json({
      message,
    });
  } catch (error) {
    console.error('Error in DELETE /feedback/:id', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * DELETE /feedback/user/:userId - Delete all feedback for user
 */
/**
 * @openapi
 * /feedback/user/{userId}:
 *   delete:
 *     summary: Delete all feedback for a user
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: All user feedback deleted successfully
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

    const count = await feedbackController.deleteUserFeedback(userId);
    res.status(HTTP.OK).json({
      message: 'All user feedback deleted successfully',
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error in DELETE /feedback/user/:userId', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
