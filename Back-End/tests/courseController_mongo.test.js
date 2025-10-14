const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const CourseController_Mongo = require('../dist/controllers/courseController/courseController_mongo').default;

// Helper pour simuler Request et Response Express
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CourseController_Mongo', () => {
  jest.setTimeout(30000); // 30 secondes pour tous les tests

  let mongoServer;
  let createdCourseCode;

  const testCourse = {
    code: 'COMP101',
    title: 'Introduction to Computer Science',
    credits: 3,
    offeredIn: 'Fall2025',
    description: 'Basics of CS',
    requisites: [
      { type: 'pre', code: 'MATH100', description: 'Basic Math' },
    ],
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it('should create a new course', async () => {
    const req = { body: testCourse };
    const res = mockResponse();

    await CourseController_Mongo.createCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
    const created = res.json.mock.calls[0][0];
    expect(created.code).toBe(testCourse.code);
    createdCourseCode = created.code;
  });

  it('should not create a duplicate course', async () => {
    const req = { body: testCourse };
    const res = mockResponse();

    await CourseController_Mongo.createCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Course already exists' })
    );
  });

  it('should get a course by code', async () => {
    const req = { params: { code: createdCourseCode } };
    const res = mockResponse();

    await CourseController_Mongo.getCourseByCode(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const course = res.json.mock.calls[0][0];
    expect(course.code).toBe(createdCourseCode);
  });

  it('should return 404 for non-existing course', async () => {
    const req = { params: { code: 'NONEXIST' } };
    const res = mockResponse();

    await CourseController_Mongo.getCourseByCode(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Course not found' })
    );
  });

  it('should update an existing course', async () => {
    const req = {
      params: { code: createdCourseCode },
      body: { title: 'Intro to CS Updated' },
    };
    const res = mockResponse();

    await CourseController_Mongo.updateCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updated = res.json.mock.calls[0][0];
    expect(updated.title).toBe('Intro to CS Updated');
  });

  it('should delete a course', async () => {
    const req = { params: { code: createdCourseCode } };
    const res = mockResponse();

    await CourseController_Mongo.deleteCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Course deleted successfully' })
    );
  });

  it('should return 404 when deleting non-existing course', async () => {
    const req = { params: { code: 'NONEXIST' } };
    const res = mockResponse();

    await CourseController_Mongo.deleteCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Course not found' })
    );
  });

  it('should get all courses', async () => {
    // Création de deux cours pour tester
    const courses = [
      { ...testCourse, code: 'COMP201' },
      { ...testCourse, code: 'COMP202' },
    ];

    for (const c of courses) {
      const req = { body: c };
      const res = mockResponse();
      await CourseController_Mongo.createCourse(req, res);
    }

    const req = {};
    const res = mockResponse();

    await CourseController_Mongo.getAllCourses(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const allCourses = res.json.mock.calls[0][0];
    expect(allCourses.length).toBeGreaterThanOrEqual(2);
  });

  it('should get courses by pool', async () => {
    const req = { params: { poolName: 'Fall2025' } };
    const res = mockResponse();

    await CourseController_Mongo.getCoursesByPool(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const poolCourses = res.json.mock.calls[0][0];
    expect(poolCourses.length).toBeGreaterThanOrEqual(1);
    expect(poolCourses[0].offeredIn).toBe('Fall2025');
  });
});
