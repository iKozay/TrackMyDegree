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
const degreeController_1 = __importDefault(require("@controllers/degreeController/degreeController"));
const DegreeXCPController_1 = __importDefault(require("@controllers/DegreeXCPController/DegreeXCPController"));
const CourseXCPController_1 = __importDefault(require("@controllers/CourseXCPController/CourseXCPController"));
const router = express_1.default.Router();
router.post('/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, name, totalCredits } = req.body;
    try {
        // Validate input
        if (!id ||
            !name ||
            typeof totalCredits !== 'number' ||
            typeof id !== 'string' ||
            typeof name !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide id, name, and totalCredits as a number.',
            });
            return;
        }
        // Call the service function
        const newDegree = yield degreeController_1.default.createDegree(id, name, totalCredits);
        // Send success response
        res.status(HTTPCodes_1.default.CREATED).json({
            message: 'Degree created successfully.',
            degree: newDegree,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Degree with this id or name already exists.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /degree/create';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
router.get('/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.body;
    try {
        // Validate input
        if (!id || typeof id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide id as a string.',
            });
            return;
        }
        // Call the service function
        const newDegree = yield degreeController_1.default.readDegree(id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Degree read successfully.',
            degree: newDegree,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Degree with this id does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /degree/read';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
router.put('/update', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, name, totalCredits } = req.body;
    try {
        // Validate input
        if (!id ||
            !name ||
            typeof totalCredits !== 'number' ||
            typeof id !== 'string' ||
            typeof name !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input.',
            });
            return;
        }
        // Call the service function
        const updatedDegree = yield degreeController_1.default.updateDegree(id, name, totalCredits);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Degree updated successfully.',
            degree: updatedDegree,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Degree with this id does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /degree/update';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
router.post('/delete', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.body;
    try {
        // Validate input
        if (!id || typeof id !== 'string') {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Invalid input. Please provide id as a string.',
            });
            return;
        }
        // Call the service function
        const newDegree = yield degreeController_1.default.deleteDegree(id);
        // Send success response
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Degree deleted successfully.',
            degree: newDegree,
        });
    }
    catch (error) {
        // Handle errors from the service
        if (error instanceof Error &&
            error.message === 'Degree with this id does not exist.') {
            res.status(HTTPCodes_1.default.FORBIDDEN).json({ error: error.message });
        }
        else {
            const errMsg = 'Internal server error in /degree/delete';
            console.error(errMsg, error);
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: errMsg });
        }
    }
}));
router.post('/getPools', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.body;
    if (!payload || Object.keys(payload).length < 1) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Degree ID is required to get Course Pools.' });
        return;
    }
    if (!payload.degree_id) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Payload attributes cannot be empty' });
        return;
    }
    const { degree_id } = payload;
    try {
        const result = yield DegreeXCPController_1.default.getAllDegreeXCP(degree_id);
        if (result && result.course_pools.length > 0) {
            const { course_pools } = result;
            let degree_coursepools = {};
            for (let i = 0; i < course_pools.length; i++) {
                const { id, name } = course_pools[i];
                const pools = Object.keys(degree_coursepools);
                if (!pools.find((item) => name === item)) {
                    degree_coursepools[name] = [];
                }
                const courses_in_pool = yield CourseXCPController_1.default.getAllCourseXCP(id);
                if (courses_in_pool) {
                    degree_coursepools[name] = courses_in_pool.course_codes;
                }
            }
            res.status(HTTPCodes_1.default.OK).json(degree_coursepools);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'No coursepools found' });
        }
    }
    catch (error) {
        console.error('Error in /degree/getPools', error);
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Coursepools could not be fetched' });
    }
}));
router.post('/getAllDegrees', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const degrees = yield degreeController_1.default.readAllDegrees();
        res.status(HTTPCodes_1.default.OK).json({ degrees });
    }
    catch (error) {
        console.error('Error in /degree/getAllDegrees', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Internal server error' });
    }
}));
router.post('/getCredits', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.body;
    if (!payload || Object.keys(payload).length < 1) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'Degree ID is required' });
        return;
    }
    if (!payload.degree_id) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Payload attributes cannot be empty' });
        return;
    }
    const { degree_id } = payload;
    try {
        const result = yield degreeController_1.default.getCreditsForDegree(degree_id);
        if (!result) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'Degree not found' });
            return;
        }
        const totalCredits = result;
        res.status(HTTPCodes_1.default.OK).json({ totalCredits });
    }
    catch (error) {
        console.error('Error in /degree/getCredits', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
