"use strict";
/**
 * Provides simple feedback operations with consistent interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackController = exports.FeedbackController = void 0;
const BaseMongoController_1 = require("./BaseMongoController");
const models_1 = require("../../models");
class FeedbackController extends BaseMongoController_1.BaseMongoController {
    constructor() {
        super(models_1.Feedback, 'Feedback');
    }
    /**
     * Submit feedback
     */
    async submitFeedback(message, user_id) {
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
                _id: result.data._id,
                message: result.data.message,
                user_id: result.data.user_id,
                submitted_at: result.data.submitted_at,
            };
        }
        catch (error) {
            this.handleError(error, 'submitFeedback');
        }
    }
    /**
     * Get all feedback with optional filtering and pagination
     */
    async getAllFeedback(options = {}) {
        try {
            const { user_id, page, limit, sort = 'desc' } = options;
            const filter = {};
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
                _id: f._id,
                message: f.message,
                user_id: f.user_id,
                submitted_at: f.submitted_at,
            }));
        }
        catch (error) {
            this.handleError(error, 'getAllFeedback');
        }
    }
    /**
     * Get feedback by ID
     */
    async getFeedbackById(feedback_id) {
        try {
            const result = await this.findById(feedback_id);
            if (!result.success) {
                throw new Error(result.error || 'Feedback not found');
            }
            return {
                _id: result.data._id,
                message: result.data.message,
                user_id: result.data.user_id,
                submitted_at: result.data.submitted_at,
            };
        }
        catch (error) {
            this.handleError(error, 'getFeedbackById');
        }
    }
    /**
     * Delete feedback by ID
     */
    async deleteFeedback(feedback_id) {
        try {
            const result = await this.deleteById(feedback_id);
            if (!result.success) {
                throw new Error(result.error || 'Feedback not found');
            }
            return result.message;
        }
        catch (error) {
            this.handleError(error, 'deleteFeedback');
        }
    }
    /**
     * Delete all feedback for a user
     */
    async deleteUserFeedback(user_id) {
        try {
            const result = await this.deleteMany({ user_id });
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete feedback');
            }
            return result.data || 0;
        }
        catch (error) {
            this.handleError(error, 'deleteUserFeedback');
        }
    }
}
exports.FeedbackController = FeedbackController;
exports.feedbackController = new FeedbackController();
//# sourceMappingURL=FeedbackController.js.map