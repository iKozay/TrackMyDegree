"use strict";
/**
 * Feedback Routes
 *
 * Handles feedback CRUD operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const mondoDBControllers_1 = require("../../controllers/mondoDBControllers");
const router = express_1.default.Router();
// ==========================
// FEEDBACK ROUTES (CRUD)
// ==========================
const INTERNAL_SERVER_ERROR = 'Internal server error';
/**
 * POST /feedback - Submit feedback
 */
router.post('/', async (req, res) => {
    try {
        const { message, user_id } = req.body;
        if (!message) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Missing required field: message',
            });
            return;
        }
        const feedback = await mondoDBControllers_1.feedbackController.submitFeedback(message, user_id);
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Feedback submitted successfully',
            feedback,
        });
    }
    catch (error) {
        console.error('Error in POST /feedback', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * GET /feedback - Get all feedback
 */
router.get('/', async (req, res) => {
    try {
        const { user_id, page, limit, sort } = req.query;
        const feedback = await mondoDBControllers_1.feedbackController.getAllFeedback({
            user_id: user_id,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            sort: sort,
        });
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Feedback retrieved successfully',
            feedback,
        });
    }
    catch (error) {
        console.error('Error in GET /feedback', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * GET /feedback/:id - Get feedback by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Feedback ID is required',
            });
            return;
        }
        const feedback = await mondoDBControllers_1.feedbackController.getFeedbackById(id);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Feedback retrieved successfully',
            feedback,
        });
    }
    catch (error) {
        console.error('Error in GET /feedback/:id', error);
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /feedback/:id - Delete feedback
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Feedback ID is required',
            });
            return;
        }
        const message = await mondoDBControllers_1.feedbackController.deleteFeedback(id);
        res.status(HTTPCodes_1.default.OK).json({
            message,
        });
    }
    catch (error) {
        console.error('Error in DELETE /feedback/:id', error);
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /feedback/user/:userId - Delete all feedback for user
 */
router.delete('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID is required',
            });
            return;
        }
        const count = await mondoDBControllers_1.feedbackController.deleteUserFeedback(userId);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'All user feedback deleted successfully',
            deletedCount: count,
        });
    }
    catch (error) {
        console.error('Error in DELETE /feedback/user/:userId', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
exports.default = router;
//# sourceMappingURL=feedbackRoutes.js.map