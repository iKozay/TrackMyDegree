"use strict";
/**
 * Timeline Routes
 *
 * Handles timeline CRUD operations
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
// TIMELINE ROUTES (CRUD)
// ==========================
const INTERNAL_SERVER_ERROR = 'Internal server error';
const TIMELINE_ID_REQUIRED = 'Timeline ID is required';
/**
 * POST /timeline - Save timeline
 */
router.post('/', async (req, res) => {
    try {
        const timelineData = req.body;
        if (!timelineData.user_id ||
            !timelineData.name ||
            !timelineData.degree_id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID, timeline name, and degree ID are required',
            });
            return;
        }
        const timeline = await mondoDBControllers_1.timelineController.saveTimeline(timelineData);
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Timeline saved successfully',
            timeline,
        });
    }
    catch (error) {
        console.error('Error in POST /timeline', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * GET /timeline/user/:userId - Get timelines for user
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'User ID is required',
            });
            return;
        }
        const timelines = await mondoDBControllers_1.timelineController.getTimelinesByUser(userId);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Timelines retrieved successfully',
            timelines,
        });
    }
    catch (error) {
        console.error('Error in GET /timeline/user/:userId', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * GET /timeline/:id - Get timeline by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: TIMELINE_ID_REQUIRED,
            });
            return;
        }
        const timeline = await mondoDBControllers_1.timelineController.getTimelineById(id);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Timeline retrieved successfully',
            timeline,
        });
    }
    catch (error) {
        console.error('Error in GET /timeline/:id', error);
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * PUT /timeline/:id - Update timeline
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: TIMELINE_ID_REQUIRED,
            });
            return;
        }
        const timeline = await mondoDBControllers_1.timelineController.updateTimeline(id, updates);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Timeline updated successfully',
            timeline,
        });
    }
    catch (error) {
        console.error('Error in PUT /timeline/:id', error);
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /timeline/:id - Delete timeline
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: TIMELINE_ID_REQUIRED,
            });
            return;
        }
        const result = await mondoDBControllers_1.timelineController.removeUserTimeline(id);
        res.status(HTTPCodes_1.default.OK).json(result);
    }
    catch (error) {
        console.error('Error in DELETE /timeline/:id', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * DELETE /timeline/user/:userId - Delete all timelines for user
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
        const count = await mondoDBControllers_1.timelineController.deleteAllUserTimelines(userId);
        res.status(HTTPCodes_1.default.OK).json({
            message: `Deleted ${count} timelines for user`,
            deletedCount: count,
        });
    }
    catch (error) {
        console.error('Error in DELETE /timeline/user/:userId', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
exports.default = router;
//# sourceMappingURL=timelineRoutes.js.map