"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const timelineController_1 = __importDefault(require("@controllers/timelineController/timelineController"));
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
//Yassine: The router can be just call the appropriate controller to handle everything. 
const router = express_1.default.Router();
// Mocro : POST /save → Save or update a timeline
// Mocro : Expects a 'timeline' object in the JSON body, including items and courses
// Mocro : Current behavior:
//        - Checks if timeline exists in body; returns 400 if missing
//        - Calls controller to save timeline
//        - Returns 200 with saved timeline if successful
//        - Returns 500 if save fails or exception occurs
// Mocro : How it can be refactored:
//        1. Move validation to a middleware to remove repeated code
//        2. Use a centralized async error handler instead of try/catch in each route
//        3. Consider using PUT for updates and POST for creation to follow REST
// Yassine: We need to use proper http methods!
// Save (or update) a timeline.
// The entire timeline (including items and courses) is passed in the JSON body.
router.post('/save', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { timeline } = req.body;
    if (!timeline || Object.keys(timeline).length === 0) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'Timeline data is required' });
        return;
    }
    try {
        const savedTimeline = yield timelineController_1.default.saveTimeline(timeline);
        if (savedTimeline) {
            res.status(HTTPCodes_1.default.OK).json(savedTimeline);
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Could not save timeline' });
        }
    }
    catch (error) {
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Could not save timeline' });
    }
}));
// Mocro : POST /getAll → Get all timelines for a user
// Mocro : Expects 'user_id' in the JSON body
// Mocro : Current behavior:
//        - Validates presence of user_id; returns 400 if missing
//        - Calls controller to fetch timelines
//        - Returns 200 with timelines or message if none found
//        - Logs error and returns 500 if exception occurs
// Mocro : How it can be refactored:
//        1. Change method to GET and pass user_id as URL param for REST compliance
//        2. Move validation to middleware
//        3. Use centralized async handler to remove try/catch
//        4. Add pagination if user has many timelines
// get not post
router.post('/getAll', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id } = req.body;
    if (!user_id || Object.keys(user_id).length === 0) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'User ID is required' });
        return;
    }
    try {
        const timelines = yield timelineController_1.default.getTimelinesByUser(user_id);
        if (timelines && timelines.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(timelines);
        }
        else {
            res.status(HTTPCodes_1.default.OK).json({ message: 'No timelines found' });
        }
    }
    catch (error) {
        console.error('Error in /timeline/getAll', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Could not retrieve timelines' });
    }
}));
// Mocro : POST /delete → Delete a timeline
// Mocro : Expects 'timeline_id' in the JSON body
// Mocro : Current behavior:
//        - Validates timeline_id; returns 404 if missing
//        - Calls controller to remove timeline
//        - Checks controller message to determine HTTP response
//        - Returns 200 if deleted, 404 if not found, 500 for other errors
// Mocro : How it can be refactored:
//        1. Use DELETE method with timeline_id as URL param
//        2. Move validation to middleware
//        3. Centralize async error handling
//        4. Standardize HTTP responses instead of parsing result string
//delete not post
router.post('/delete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { timeline_id } = req.body;
    if (!timeline_id) {
        res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'Timeline ID is required' });
        return;
    }
    try {
        const result = yield timelineController_1.default.removeUserTimeline(timeline_id);
        if (!result) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ message: result });
        }
        if (result.includes('deleted successfully')) {
            res.status(HTTPCodes_1.default.OK).json({ message: result });
        }
        else if (result.includes('No timeline found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: result });
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'Internal Server Error' });
        }
    }
    catch (error) {
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Failed to delete timeline' });
    }
}));
exports.default = router;
