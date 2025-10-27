import express, { Request, Response } from 'express';
import courseController from '@controllers/courseController/courseController';
import CourseTypes from '@controllers/courseController/course_types';
import HTTP from '@Util/HTTPCodes';

const ERROR_MESSAGE = {
  NO_COURSE_FOUND: 'No courses found',
  GET_ALL_COURSE: 'Error in /courses/getAll',
  RETRIEVE_COURSE: 'Could not retrieve courses',
} as const;
const router = express.Router();

// Get course by code and number (via request body)
router.post('/get', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    res.status(HTTP.BAD_REQUEST).json({ error: 'Course code is required' });
    return;
  }

  try {
    const course = await courseController.getCourseByCode(code);

    if (course) {
      res.status(HTTP.OK).json(course);
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: 'Course not found' });
    }
  } catch (error) {
    console.error('Error in /courses/get', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Could not retrieve course' });
  }
});

// Remove a course by code and number (via request body)
router.post('/remove', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    res.status(HTTP.BAD_REQUEST).json({ error: 'Course code is required' });
    return;
  }

  try {
    const success = await courseController.removeCourse(code);

    if (success) {
      res.status(HTTP.OK).json({ message: 'Course removed successfully' });
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: 'Course not found' });
    }
  } catch (error) {
    console.error('Error in /courses/remove', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Could not remove course' });
  }
});

// Add a new course (still part of the body)
router.post('/add', async (req: Request, res: Response) => {
  const courseInfo: CourseTypes.CourseInfo = req.body;

  const courseInfoCorrect =
    courseInfo.code &&
    courseInfo.credits &&
    courseInfo.offeredIn &&
    courseInfo.description &&
    courseInfo.title;

  if (!courseInfo || !courseInfoCorrect) {
    res.status(HTTP.BAD_REQUEST).json({ error: 'Course data is required' });
    return;
  }

  try {
    const result = await courseController.addCourse(courseInfo);
    res.status(HTTP.CREATED).json(result);
  } catch (error) {
    console.error('Error in /courses/add', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Could not add course' });
  }
});

// Fetch all courses
router.post('/getAll', async (req: Request, res: Response) => {
  try {
    const courses = await courseController.getAllCourses();

    if (courses && courses.length > 0) {
      res.status(HTTP.OK).json(courses);
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: ERROR_MESSAGE.NO_COURSE_FOUND });
    }
  } catch (error) {
    console.error(ERROR_MESSAGE.GET_ALL_COURSE, error);
    res.status(HTTP.SERVER_ERR).json({ error: ERROR_MESSAGE.RETRIEVE_COURSE });
  }
});

router.post('/getByDegreeGrouped', async (req: Request, res: Response) => {
  const { degree } = req.body;

  if (!degree) {
    res.status(HTTP.BAD_REQUEST).json({ error: 'Degree is required' });
    return;
  }

  try {
    const courses = await courseController.getCoursesByDegreeGrouped(degree);

    if (courses && courses.length > 0) {
      res.status(HTTP.OK).json(courses);
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: ERROR_MESSAGE.NO_COURSE_FOUND });
    }
  } catch (error) {
    console.error('Error in /courses/getByDegree', error);
    res.status(HTTP.SERVER_ERR).json({ error: ERROR_MESSAGE.RETRIEVE_COURSE });
  }
});

router.post('/getAllCourses', async (req: Request, res: Response) => {
  try {
    const courses = await courseController.getAllCoursesInDB();

    if (courses && courses.length > 0) {
      res.status(HTTP.OK).json(courses);
    } else {
      res.status(HTTP.NOT_FOUND).json({ error: ERROR_MESSAGE.NO_COURSE_FOUND });
    }
  } catch (error) {
    console.error(ERROR_MESSAGE.GET_ALL_COURSE, error);
    res.status(HTTP.SERVER_ERR).json({ error: ERROR_MESSAGE.RETRIEVE_COURSE });
  }
});

export default router;
