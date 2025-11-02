/**
 * Feedback Routes
 *
 * Handles feedback CRUD operations
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { feedbackController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// FEEDBACK ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';

/**
 * POST /feedback - Submit feedback
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
