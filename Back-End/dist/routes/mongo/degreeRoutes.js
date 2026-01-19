"use strict";
/**
 * Degree Routes
 *
 * Handles degree operations
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
// DEGREE ROUTES
// ==========================
const INTERNAL_SERVER_ERROR = 'Internal server error';
/**
 * GET /degree/:id - Get degree by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Degree ID is required',
            });
            return;
        }
        const degree = await mondoDBControllers_1.degreeController.readDegree(id);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Degree retrieved successfully',
            degree,
        });
    }
    catch (error) {
        console.error('Error in GET /degree/:id', error);
        if (error instanceof Error && error.message.includes('does not exist')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /degree - Get all degrees
 */
router.get('/', async (req, res) => {
    try {
        const degrees = await mondoDBControllers_1.degreeController.readAllDegrees();
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Degrees retrieved successfully',
            degrees,
        });
    }
    catch (error) {
        console.error('Error in GET /degree', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * GET /degree/:id/credits - Get credits for degree
 */
router.get('/:id/credits', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Degree ID is required',
            });
            return;
        }
        const credits = await mondoDBControllers_1.degreeController.getCreditsForDegree(id);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Credits retrieved successfully',
            totalCredits: credits,
        });
    }
    catch (error) {
        console.error('Error in GET /degree/:id/credits', error);
        if (error instanceof Error && error.message.includes('does not exist')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
exports.default = router;
//# sourceMappingURL=degreeRoutes.js.map