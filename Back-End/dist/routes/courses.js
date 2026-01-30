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
const courseController_1 = __importDefault(require("@controllers/courseController/courseController"));
const HTTPCodes_1 = __importDefault(require("@Util/HTTPCodes"));
const router = express_1.default.Router();
// Get course by code and number (via request body)
router.post("/get", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.body;
    if (!code) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: "Course code is required" });
        return;
    }
    try {
        const course = yield courseController_1.default.getCourseByCode(code);
        if (course) {
            res.status(HTTPCodes_1.default.OK).json(course);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: "Course not found" });
        }
    }
    catch (error) {
        console.error("Error in /courses/get", error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: "Could not retrieve course" });
    }
}));
// Remove a course by code and number (via request body)
router.post("/remove", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.body;
    if (!code) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: "Course code is required" });
        return;
    }
    try {
        const success = yield courseController_1.default.removeCourse(code);
        if (success) {
            res.status(HTTPCodes_1.default.OK).json({ message: "Course removed successfully" });
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: "Course not found" });
        }
    }
    catch (error) {
        console.error("Error in /courses/remove", error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: "Could not remove course" });
    }
}));
// Add a new course (still part of the body)
router.post("/add", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const courseInfo = req.body;
    const courseInfoCorrect = courseInfo.code &&
        courseInfo.credits &&
        courseInfo.offeredIn &&
        courseInfo.description &&
        courseInfo.title;
    if (!courseInfo || !courseInfoCorrect) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: "Course data is required" });
        return;
    }
    try {
        const result = yield courseController_1.default.addCourse(courseInfo);
        res.status(HTTPCodes_1.default.CREATED).json(result);
    }
    catch (error) {
        console.error("Error in /courses/add", error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: "Could not add course" });
    }
}));
// Fetch all courses
router.post("/getAll", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courses = yield courseController_1.default.getAllCourses();
        if (courses && courses.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(courses);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: "No courses found" });
        }
    }
    catch (error) {
        console.error("Error in /courses/getAll", error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: "Could not retrieve courses" });
    }
}));
router.post("/getByDegreeGrouped", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { degree } = req.body;
    if (!degree) {
        res.status(HTTPCodes_1.default.BAD_REQUEST).json({ error: "Degree is required" });
        return;
    }
    try {
        const courses = yield courseController_1.default.getCoursesByDegreeGrouped(degree);
        if (courses && courses.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(courses);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: "No courses found" });
        }
    }
    catch (error) {
        console.error("Error in /courses/getByDegree", error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: "Could not retrieve courses" });
    }
}));
router.post("/getAllCourses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courses = yield courseController_1.default.getAllCoursesInDB();
        if (courses && courses.length > 0) {
            res.status(HTTPCodes_1.default.OK).json(courses);
        }
        else {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: "No courses found" });
        }
    }
    catch (error) {
        console.error("Error in /courses/getAll", error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: "Could not retrieve courses" });
    }
}));
exports.default = router;
