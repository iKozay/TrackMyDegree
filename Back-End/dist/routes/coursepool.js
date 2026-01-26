"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const coursepoolController_1 = __importDefault(require("../controllers/coursepoolController/coursepoolController"));
const DB_Ops_1 = __importDefault(require("../Util/DB_Ops"));
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const EMPTY_PAYLOAD = 'Payload attributes cannot be empty';
const router = express_1.default.Router();
router.post('/create', async (req, res) => {
    const payload = req.body;
    if (!payload || Object.keys(payload).length < 1) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({
            error: 'Payload containing name of coursepool is required for create.',
        });
        return;
    }
    if (!payload.name) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: EMPTY_PAYLOAD });
        return;
    }
    const { name } = payload;
    try {
        const response = await coursepoolController_1.default.createCoursePool(name);
        if (DB_Ops_1.default.SUCCESS === response) {
            res
                .status(HTTPCodes_1.default.CREATED)
                .json({ res: 'New CoursePool added successfully' });
        }
        if (DB_Ops_1.default.MOSTLY_OK === response) {
            res
                .status(HTTPCodes_1.default.SERVER_ERR)
                .json({ res: 'Error in adding new CoursePool to database' });
        }
        if (DB_Ops_1.default.FAILURE === response) {
            throw new Error('Error in establishing connection to database');
        }
    }
    catch (error) {
        console.error('Error in /coursepool/create', error);
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'CoursePool could not be created' });
    }
});
router.get('/getAll', async (req, res) => {
    try {
        const response = await coursepoolController_1.default.getAllCoursePools();
        if (!response) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'No Course pools found' });
        }
        res.status(HTTPCodes_1.default.OK).json(response);
    }
    catch (error) {
        console.error('Error in /coursepool/getAll', error);
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Course Pools could not be fetched' });
    }
});
router.post('/get', async (req, res) => {
    const { course_pool_id } = req.body;
    if (!course_pool_id) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'Course Pool ID is required to get course pool.' });
        return;
    }
    try {
        const response = await coursepoolController_1.default.getCoursePool(course_pool_id);
        if (response) {
            res.status(HTTPCodes_1.default.OK).json(response);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'Course Pool not found' });
        }
    }
    catch (error) {
        console.error('Error in /coursepool/get', error);
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'Could not retrieve Course Pool' });
    }
});
router.post('/update', async (req, res) => {
    const payload = req.body;
    if (!payload || Object.keys(payload).length < 2) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({
            error: 'Payload of type CoursePoolItem is required for update.',
        });
        return;
    }
    if (!payload.id || !payload.name) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: EMPTY_PAYLOAD });
        return;
    }
    try {
        const response = await coursepoolController_1.default.updateCoursePool(payload);
        if (DB_Ops_1.default.SUCCESS === response) {
            res
                .status(HTTPCodes_1.default.OK)
                .json({ message: 'CoursePool item updated successfully' });
        }
        if (DB_Ops_1.default.MOSTLY_OK === response) {
            res
                .status(HTTPCodes_1.default.NOT_FOUND)
                .json({ error: 'Item not found in CoursePool' });
        }
        if (DB_Ops_1.default.FAILURE === response) {
            throw new Error('CoursePool item could not be updated');
        }
    }
    catch (error) {
        console.error('Error in /coursepool/update', error);
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'CoursePool item could not be updated' });
    }
});
router.post('/delete', async (req, res) => {
    const payload = req.body;
    if (!payload || Object.keys(payload).length < 1) {
        res
            .status(HTTPCodes_1.default.BAD_REQUEST)
            .json({ error: 'ID is required to remove item from CoursePool.' });
        return;
    }
    if (!payload.course_pool_id) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: EMPTY_PAYLOAD });
        return;
    }
    const { course_pool_id } = payload;
    try {
        const response = await coursepoolController_1.default.removeCoursePool(course_pool_id);
        if (DB_Ops_1.default.SUCCESS === response) {
            res.status(HTTPCodes_1.default.OK).json({ message: 'Item removed from CoursePool' });
        }
        if (DB_Ops_1.default.MOSTLY_OK === response) {
            res
                .status(HTTPCodes_1.default.NOT_FOUND)
                .json({ error: 'Item not found in CoursePool' });
        }
        if (DB_Ops_1.default.FAILURE === response) {
            throw new Error('CoursePool item could not be deleted');
        }
    }
    catch (error) {
        console.error('Error in /coursepool/delete', error);
        res
            .status(HTTPCodes_1.default.SERVER_ERR)
            .json({ error: 'CoursePool item could not be deleted' });
    }
});
exports.default = router;
//# sourceMappingURL=coursepool.js.map