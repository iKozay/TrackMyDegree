"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTimelineId = exports.validateUserId = exports.validateTimelineBody = void 0;
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const validateTimelineBody = (req, res, next) => {
    const { timeline } = req.body;
    if (!timeline || Object.keys(timeline).length === 0) {
        return res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Timeline data is required' });
    }
    next();
};
exports.validateTimelineBody = validateTimelineBody;
const validateUserId = (req, res, next) => {
    const { userId } = req.params;
    if (!userId)
        return res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'User ID is required' });
    next();
};
exports.validateUserId = validateUserId;
const validateTimelineId = (req, res, next) => {
    const { timelineId } = req.params;
    if (!timelineId)
        return res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Timeline ID is required' });
    next();
};
exports.validateTimelineId = validateTimelineId;
//# sourceMappingURL=timelineValidators.js.map