"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const requisiteController_1 = __importDefault(require("../controllers/requisiteController/requisiteController"));
const router = express_1.default.Router();
router.post('/create', async (req, res) => {
    const { code1, code2, type } = req.body;
    try {
        // Validate input
        if (!code1 || !code2 || !type) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide code1, and code2 as a string.',
            });
            return;
        }
        // Call the service function
        const newRequisite = await requisiteController_1.default.createRequisite(code1, code2, type);
        // Send success response
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Requisite created successfully.',
            requisite: newRequisite,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Requisite with this id already exists.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /requisite/create';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
router.post('/read', async (req, res) => {
    const { code1, code2, type } = req.body;
    try {
        // Validate input
        if (!code1) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide code1 as a string.',
            });
            return;
        }
        // Call the service function
        const requisites = await requisiteController_1.default.readRequisite(code1, code2, type);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Requisites read successfully.',
            requisites, // Return the array of requisites
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message ===
                'The course combination or type provided does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /requisite/read';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
router.post('/update', async (req, res) => {
    const { code1, code2, type } = req.body;
    try {
        // Validate input
        if (!code1 || !code2 || !type) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input.',
            });
            return;
        }
        // Call the service function
        const updatedRequisite = await requisiteController_1.default.updateRequisite(code1, code2, type);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Requisite updated successfully.',
            requisite: updatedRequisite,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Requisite with this course combination does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /requisite/update';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
router.post('/delete', async (req, res) => {
    const { code1, code2, type } = req.body;
    try {
        // Validate input
        if (!code1 || !code2 || !type) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input.',
            });
            return;
        }
        // Call the service function
        await requisiteController_1.default.deleteRequisite(code1, code2, type);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Requisite deleted successfully.',
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Requisite with this course combination does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /requisite/delete';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
});
exports.default = router;
//# sourceMappingURL=requisite.js.map