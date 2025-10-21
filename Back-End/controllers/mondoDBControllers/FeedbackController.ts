/**
 * Optimized Feedback Controller
 *
 * Simple feedback operations using the base controller.
 */

import { BaseMongoController, ControllerResponse } from './BaseMongoController';
import { Feedback } from '../../models';

export class FeedbackController extends BaseMongoController<any> {
  constructor() {
    super(Feedback, 'Feedback');
  }

  /**
   * Submit feedback
   */
  async submitFeedback(
    message: string,
    user_id?: string,
  ): Promise<{
    id: string;
    message: string;
    user_id: string;
    submitted_at: string;
  }> {
    try {
      const result = await this.create({
        message,
        user_id: user_id || null,
      });

      if (!result.success) {
        throw new Error('Failed to submit feedback');
      }

      return {
        id: result.data._id,
        message: result.data.message,
        user_id: result.data.user_id,
        submitted_at: result.data.submitted_at,
      };
    } catch (error) {
      this.handleError(error, 'submitFeedback');
    }
  }

  /**
   * Get all feedback with optional filtering
   */
  async getAllFeedback(
    user_id?: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<ControllerResponse<any[]>> {
    try {
      const filter: any = {};
      if (user_id) {
        filter.user_id = user_id;
      }

      return await this.findAll(filter, options);
    } catch (error) {
      this.handleError(error, 'getAllFeedback');
    }
  }

  /**
   * Delete feedback by ID
   */
  async deleteFeedback(
    feedback_id: string,
  ): Promise<ControllerResponse<string>> {
    try {
      return await this.deleteById(feedback_id);
    } catch (error) {
      this.handleError(error, 'deleteFeedback');
    }
  }
}

export const feedbackController = new FeedbackController();
