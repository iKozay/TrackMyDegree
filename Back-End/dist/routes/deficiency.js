"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const deficiencyController_1 = __importDefault(require("../controllers/deficiencyController/deficiencyController"));
const router = express_1.default.Router();
router.post('/create', async (req, res) => {
    const { coursepool, user_id, creditsRequired } = req.body;
    try {
        // Validate input
        if (!coursepool ||
            !user_id ||
            !creditsRequired ||
            typeof coursepool !== 'string' ||
            typeof user_id !== 'string' ||
            typeof creditsRequired !== 'number') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide coursepool, user_id, and creditsRequired in valid format.',
            });
            return;
        }
        // Call the service function
        const newDeficiency = await deficiencyController_1.default.createDeficiency(coursepool, user_id, creditsRequired);
        // Send success response
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Deficiency created successfully.',
            deficiency: newDeficiency,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error) {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /deficiency/create';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
router.post('/getAll', async (req, res) => {
    const { user_id } = req.body;
    try {
        // Validate input
        if (!user_id || typeof user_id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide user_id as a string.',
            });
            return;
        }
        // Call the service function
        const newDeficiency = await deficiencyController_1.default.getAllDeficienciesByUser(user_id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Deficiency read successfully.',
            deficiency: newDeficiency,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error) {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /deficiency/getAll';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
router.post('/delete', async (req, res) => {
    const { coursepool, user_id } = req.body;
    try {
        // Validate input
        if (!coursepool ||
            !user_id ||
            typeof coursepool !== 'string' ||
            typeof user_id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide id as a string.',
            });
            return;
        }
        // Call the service function
        await deficiencyController_1.default.deleteDeficiencyByCoursepoolAndUserId(coursepool, user_id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Deficiency deleted successfully.',
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Deficiency with this id does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /deficiency/delete';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
exports.default = router;
//# sourceMappingURL=deficiency.js.map