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
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const exemptionController_1 = __importDefault(require("@controllers/exemptionController/exemptionController"));
const router = express_1.default.Router();
router.post('/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { coursecodes, user_id } = req.body;
    try {
        // Validate input
        if (!Array.isArray(coursecodes) ||
            coursecodes.some((cc) => typeof cc !== 'string') ||
            typeof user_id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide an array of course codes and a user_id as a string.',
            });
            return;
        }
        // Call the service function
        const result = yield exemptionController_1.default.createExemptions(coursecodes, user_id);
        // Compose a success message
        let message = 'Exemptions created successfully.';
        if (result.alreadyExists.length > 0) {
            message += ` Exemptions for the following course codes already existed: ${result.alreadyExists.join(', ')}.`;
        }
        // Send success response
        res.status(HTTPCodes_1.default.CREATED).json({
            message,
            exemptions: result.created,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error) {
            console.error('ERROR: ', error.message);
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /exemption/create';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
router.post('/getAll', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const newExemption = yield exemptionController_1.default.getAllExemptionsByUser(user_id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Exemption read successfully.',
            exemption: newExemption,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error) {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /exemption/getAll';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
router.post('/delete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { coursecode, user_id } = req.body;
    try {
        // Validate input
        if (!coursecode ||
            typeof coursecode !== 'string' ||
            !user_id ||
            typeof user_id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide coursecode and user_id as strings.',
            });
            return;
        }
        // Call the service function
        yield exemptionController_1.default.deleteExemptionByCoursecodeAndUserId(coursecode, user_id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Exemption deleted successfully.',
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error) {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /exemption/delete';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
exports.default = router;
