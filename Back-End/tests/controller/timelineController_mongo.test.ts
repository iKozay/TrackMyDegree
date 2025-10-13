import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseController from '../../controllers/courseController/courseController_mongo';
import CourseTypes from '../../controllers/courseController/course_types';

describe('CourseController (MongoDB)', () => {
  let mongoServer: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  let createdCourseId: string;

  const testCourse: CourseTypes.Course = {
    code: 'COMP479',
    title: 'Software Engineering',
    credits: 3,
    department: 'Computer Science',
    prerequisites: ['COMP101'],
  };

  it('should save a new course', async () => {
    const saved = await CourseController.saveCourse(testCourse);
    expect(saved).toHaveProperty('id');
    expect(saved.code).toBe(testCourse.code);
    expect(saved.title).toBe(testCourse.title);
    createdCourseId = saved.id!;
  });

  it('should fetch courses by code', async () => {
    const courses = await CourseController.getCoursesByCode(testCourse.code);
    expect(courses.length).toBeGreaterThan(0);
    const fetched = courses.find((c) => c.id === createdCourseId);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe(testCourse.title);
  });

  it('should update a course', async () => {
    const updatedTitle = 'Advanced Software Engineering';
    const updated = await CourseController.updateCourse(createdCourseId, {
      ...testCourse,
      title: updatedTitle,
    });
    expect(updated.title).toBe(updatedTitle);
  });

  it('should delete a course', async () => {
    const result = await CourseController.removeCourse(createdCourseId);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/deleted successfully/);

    const coursesAfterDelete = await CourseController.getCoursesByCode(testCourse.code);
    const deleted = coursesAfterDelete.find((c) => c.id === createdCourseId);
    expect(deleted).toBeUndefined();
  });

  it('should return failure if deleting non-existing course', async () => {
    const result = await CourseController.removeCourse('nonexistentid123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found|Error occurred/);
  });
});
