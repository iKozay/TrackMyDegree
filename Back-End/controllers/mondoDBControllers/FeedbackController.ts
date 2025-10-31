/**
 * Provides simple feedback operations with consistent interface.
 */

import { BaseMongoController } from './BaseMongoController';
import { Feedback } from '../../models';

export interface FeedbackData {
  id?: string;
  message: string;
  user_id?: string | null;
  submitted_at?: Date;
}

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
  ): Promise<FeedbackData> {
    try {
      const result = await this.create({
        message,
        user_id: user_id || null,
        submitted_at: new Date(),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
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
   * Get all feedback with optional filtering and pagination
   */
  async getAllFeedback(
    options: {
      user_id?: string;
      page?: number;
      limit?: number;
      sort?: 'asc' | 'desc';
    } = {},
  ): Promise<FeedbackData[]> {
    try {
      const { user_id, page, limit, sort = 'desc' } = options;

      const filter: any = {};
      if (user_id) {
        filter.user_id = user_id;
      }

      const result = await this.findAll(filter, {
        page,
        limit,
        sort: { submitted_at: sort === 'desc' ? -1 : 1 },
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feedback');
      }

      return (result.data || []).map((f) => ({
        id: f._id,
        message: f.message,
        user_id: f.user_id,
        submitted_at: f.submitted_at,
      }));
    } catch (error) {
      this.handleError(error, 'getAllFeedback');
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedback_id: string): Promise<FeedbackData> {
    try {
      const result = await this.findById(feedback_id);

      if (!result.success) {
        throw new Error(result.error || 'Feedback not found');
      }

      return {
        id: result.data._id,
        message: result.data.message,
        user_id: result.data.user_id,
        submitted_at: result.data.submitted_at,
      };
    } catch (error) {
      this.handleError(error, 'getFeedbackById');
    }
  }

  /**
   * Delete feedback by ID
   */
  async deleteFeedback(feedback_id: string): Promise<string> {
    try {
      const result = await this.deleteById(feedback_id);

      if (!result.success) {
        throw new Error(result.error || 'Feedback not found');
      }

      return result.message!;
    } catch (error) {
      this.handleError(error, 'deleteFeedback');
    }
  }

  /**
   * Delete all feedback for a user
   */
  async deleteUserFeedback(user_id: string): Promise<number> {
    try {
      const result = await this.deleteMany({ user_id });

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete feedback');
      }

      return result.data || 0;
    } catch (error) {
      this.handleError(error, 'deleteUserFeedback');
    }
  }
}

export const feedbackController = new FeedbackController();
