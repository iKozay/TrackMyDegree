"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const timelineController_1 = __importDefault(require("../controllers/timelineController/timelineController"));
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const timelineValidators_1 = require("../middleware/timelineValidators");
const router = express_1.default.Router();
/**
 * POST /api/timeline
 * Creates a new timeline.
 * Body: { timeline: {...} }
 */
router.post('/', timelineValidators_1.validateTimelineBody, (0, asyncHandler_1.default)(async (req, res) => {
    const { timeline } = req.body;
    if (!timeline || Object.keys(timeline).length === 0) {
        return res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Timeline data is required' });
    }
    const savedTimeline = await timelineController_1.default.saveTimeline(timeline);
    if (savedTimeline) {
        return res.status(HTTPCodes_1.default.OK).json(savedTimeline);
    }
    else {
        return res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Could not save timeline' });
    }
}));
/**
 * PUT /api/timeline/:timelineId
 * Updates an existing timeline using the provided ID.
 * Body: { timeline: {...} }
 */
router.put('/:timelineId', timelineValidators_1.validateTimelineBody, (0, asyncHandler_1.default)(async (req, res) => {
    const { timelineId } = req.params;
    const { timeline } = req.body;
    if (!timeline || Object.keys(timeline).length === 0) {
        return res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Timeline data is required' });
    }
    timeline.id = timelineId; // Ensure correct ID for update
    const savedTimeline = await timelineController_1.default.saveTimeline(timeline);
    if (savedTimeline) {
        return res.status(HTTPCodes_1.default.OK).json(savedTimeline);
    }
    else {
        return res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Could not save/update timeline' });
    }
}));
/**
 * GET /api/timeline/user/:userId
 * Retrieves all timelines for the specified user.
 */
router.get('/user/:userId', timelineValidators_1.validateUserId, (0, asyncHandler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const timelines = await timelineController_1.default.getTimelinesByUser(userId);
    if (timelines && timelines.length > 0) {
        return res.status(HTTPCodes_1.default.OK).json(timelines);
    }
    else {
        return res.status(HTTPCodes_1.default.OK).json({ message: 'No timelines found' });
    }
}));
/**
 * DELETE /api/timeline/:timelineId
 * Deletes a timeline by its ID.
 */
router.delete('/:timelineId', timelineValidators_1.validateTimelineId, (0, asyncHandler_1.default)(async (req, res) => {
    const { timelineId } = req.params;
    const result = await timelineController_1.default.removeUserTimeline(timelineId);
    // ✅ Defensive check
    if (!result || typeof result !== 'object' || !('message' in result)) {
        return res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Unexpected response from controller' });
    }
    const { success, message } = result;
    if (success && message.includes('deleted successfully')) {
        return res.status(HTTPCodes_1.default.OK).json({ message });
    }
    else if (message.includes('No timeline found')) {
        return res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: message });
    }
    else {
        return res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Internal Server Error' });
    }
}));
exports.default = router;
//# sourceMappingURL=timeline.js.map