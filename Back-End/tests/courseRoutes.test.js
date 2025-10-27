const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const courseRoutes = require('../dist/routes/mongo/courseRoutes').default;
const { Course } = require('../dist/models/Course');

// Create test app
const app = express();
app.use(express.json());
app.use('/courses', courseRoutes);

describe('Course Routes', () => {
  let mongoServer, mongoUri;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Course.deleteMany({});
  });

  describe('GET /courses', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: ['Fall', 'Winter'],
          prerequisites: ['MATH101'],
          corequisites: []
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 3,
          offeredIn: ['Winter', 'Summer'],
          prerequisites: ['COMP101'],
          corequisites: []
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Differential calculus',
          credits: 4,
          offeredIn: ['Fall', 'Winter', 'Summer'],
          prerequisites: [],
          corequisites: []
        }
      ]);
    });

    it('should get all courses', async () => {
      const response = await request(app)
        .get('/courses')
        .expect(200);

      expect(response.body.message).toBe('Courses retrieved successfully');
      expect(response.body.courses).toHaveLength(3);
      expect(response.body.courses[0]).toHaveProperty('title');
      expect(response.body.courses[0]).toHaveProperty('description');
      expect(response.body.courses[0]).toHaveProperty('_id');
    });

    it('should filter courses by pool', async () => {
      const response = await request(app)
        .get('/courses?pool=Fall')
        .expect(200);

      expect(response.body.courses).toHaveLength(2);
      expect(response.body.courses.every(course => course.offeredIn.includes('Fall'))).toBe(true);
    });

    it('should search courses by title and description', async () => {
      const response = await request(app)
        .get('/courses?search=programming')
        .expect(200);

      expect(response.body.courses).toHaveLength(1);
      expect(response.body.courses[0].title).toBe('Introduction to Programming');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/courses?page=1&limit=2')
        .expect(200);

      expect(response.body.courses).toHaveLength(2);
    });

    it('should sort courses by specified field', async () => {
      const response = await request(app)
        .get('/courses?sort=credits')
        .expect(200);

      expect(response.body.courses[0].credits).toBeLessThanOrEqual(response.body.courses[1].credits);
    });

    it('should handle server errors', async () => {
      // Mock courseController.getAllCourses to throw an error
      const originalGetAllCourses = require('../dist/controllers/mondoDBControllers/CourseController').courseController.getAllCourses;
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getAllCourses = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/courses')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getAllCourses = originalGetAllCourses;
    });
  });

  describe('GET /courses/:code', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3,
        offeredIn: ['Fall', 'Winter'],
        prerequisites: ['MATH101'],
        corequisites: []
      });
    });

    it('should get course by code', async () => {
      const response = await request(app)
        .get('/courses/COMP101')
        .expect(200);

      expect(response.body.message).toBe('Course retrieved successfully');
      expect(response.body.course).toMatchObject({
        _id: 'COMP101',
        title: 'Introduction to Programming',
        description: 'Basic programming concepts',
        credits: 3
      });
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/courses/NONEXISTENT')
        .expect(404);

      expect(response.body.error).toBe('Course not found');
    });

    it('should handle server errors', async () => {
      // Mock courseController.getCourseByCode to throw an error
      const originalGetCourseByCode = require('../dist/controllers/mondoDBControllers/CourseController').courseController.getCourseByCode;
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getCourseByCode = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/courses/COMP101')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getCourseByCode = originalGetCourseByCode;
    });
  });
});
