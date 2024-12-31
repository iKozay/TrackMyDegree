import express, { Request, Response } from "express";
import courseController from "@controllers/courseController/coursesController";
import CourseTypes from "@controllers/courseController/course_types";
import HTTP from "@Util/HTTPCodes";

const router = express.Router();

// Get course by code and number (via request body)
router.post('/get', async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!(code)) {
        res.status(HTTP.BAD_REQUEST).json({ error: "Course code is required" });
        return;
    }

    try {
        const course = await courseController.getCourseByCode(code);

        if (course) {
            res.status(HTTP.OK).json(course);
        } else {
            res.status(HTTP.NOT_FOUND).json({ error: "Course not found" });
        }
    } catch (error) {
        console.error("Error in /courses/get", error);
        res.status(HTTP.SERVER_ERR).json({ error: "Could not retrieve course" });
    }
});

// Remove a course by code and number (via request body)
router.post('/remove', async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!(code)) {
        res.status(HTTP.BAD_REQUEST).json({ error: "Course code is required" });
        return;
    }

    try {
        const success = await courseController.removeCourse(code);

        if (success) {
            res.status(HTTP.OK).json({ message: "Course removed successfully" });
        } else {
            res.status(HTTP.NOT_FOUND).json({ error: "Course not found" });
        }
    } catch (error) {
        console.error("Error in /courses/remove", error);
        res.status(HTTP.SERVER_ERR).json({ error: "Could not remove course" });
    }
});

// Add a new course (still part of the body)
router.post('/add', async (req: Request, res: Response) => {
    const courseInfo: CourseTypes.CourseInfo = req.body;

    if (!courseInfo) {
        res.status(HTTP.BAD_REQUEST).json({ error: "Course data is required" });
        return;
    }

    try {
        const result = await courseController.addCourse(courseInfo);
        res.status(HTTP.CREATED).json(result);
    } catch (error) {
        console.error("Error in /courses/add", error);
        res.status(HTTP.SERVER_ERR).json({ error: "Could not add course" });
    }

});

// Fetch all courses
router.post('/getAll', async (req: Request, res: Response) => {
    try {
        const courses = await courseController.getAllCourses();

        if (courses && courses.length > 0) {
            res.status(HTTP.OK).json(courses);
        } else {
            res.status(HTTP.NOT_FOUND).json({ error: "No courses found" });
        }
    } catch (error) {
        console.error("Error in /courses/getAll", error);
        res.status(HTTP.SERVER_ERR).json({ error: "Could not retrieve courses" });
    }
});

export default router;
