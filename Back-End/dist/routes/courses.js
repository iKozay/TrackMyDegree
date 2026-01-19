"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const courseController_1 = __importDefault(require("../controllers/courseController/courseController"));
const HTTPCodes_1 = __importDefault(require("../Util/HTTPCodes"));
const ERROR_MESSAGE = {
    NO_COURSE_FOUND: 'No courses found',
    GET_ALL_COURSE: 'Error in /courses/getAll',
    RETRIEVE_COURSE: 'Could not retrieve courses',
};
const router = express_1.default.Router();
// Get course by code and number (via request body)
router.post('/get', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'Course code is required' });
        return;
    }
    try {
        const course = await courseController_1.default.getCourseByCode(code);
        if (course) {
            res.status(HTTPCodes_1.default.OK).json(course);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'Course not found' });
        }
    }
    catch (error) {
        console.error('Error in /courses/get', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Could not retrieve course' });
    }
});
// Remove a course by code and number (via request body)
router.post('/remove', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'Course code is required' });
        return;
    }
    try {
        const success = await courseController_1.default.removeCourse(code);
        if (success) {
            res.status(HTTPCodes_1.default.OK).json({ message: 'Course removed successfully' });
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: 'Course not found' });
        }
    }
    catch (error) {
        console.error('Error in /courses/remove', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Could not remove course' });
    }
});
// Add a new course (still part of the body)
router.post('/add', async (req, res) => {
    const courseInfo = req.body;
    const courseInfoCorrect = courseInfo.code &&
        courseInfo.credits &&
        courseInfo.offeredIn &&
        courseInfo.description &&
        courseInfo.title;
    if (!courseInfo || !courseInfoCorrect) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'Course data is required' });
        return;
    }
    try {
        const result = await courseController_1.default.addCourse(courseInfo);
        res.status(HTTPCodes_1.default.CREATED).json(result);
    }
    catch (error) {
        console.error('Error in /courses/add', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Could not add course' });
    }
});
// Fetch all courses
router.post('/getAll', async (req, res) => {
    try {
        const courses = await courseController_1.default.getAllCourses();
        if (courses && courses.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(courses);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: ERROR_MESSAGE.NO_COURSE_FOUND });
        }
    }
    catch (error) {
        console.error(ERROR_MESSAGE.GET_ALL_COURSE, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: ERROR_MESSAGE.RETRIEVE_COURSE });
    }
});
router.post('/getByDegreeGrouped', async (req, res) => {
    const { degree } = req.body;
    if (!degree) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: 'Degree is required' });
        return;
    }
    try {
        const courses = await courseController_1.default.getCoursesByDegreeGrouped(degree);
        if (courses && courses.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(courses);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: ERROR_MESSAGE.NO_COURSE_FOUND });
        }
    }
    catch (error) {
        console.error('Error in /courses/getByDegree', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: ERROR_MESSAGE.RETRIEVE_COURSE });
    }
});
router.post('/getAllCourses', async (req, res) => {
    try {
        const courses = await courseController_1.default.getAllCoursesInDB();
        if (courses && courses.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(courses);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: ERROR_MESSAGE.NO_COURSE_FOUND });
        }
    }
    catch (error) {
        console.error(ERROR_MESSAGE.GET_ALL_COURSE, error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: ERROR_MESSAGE.RETRIEVE_COURSE });
    }
});
exports.default = router;
//# sourceMappingURL=courses.js.map