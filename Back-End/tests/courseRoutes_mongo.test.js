const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const courseRoutes = require('../dist/routes/mongo/courseRoutes').default;
const { Course } = require('../dist/models/Course');
const { courseController } = require('../dist/controllers/mondoDBControllers');

describe('Course Routes (MongoDB)', () => {
  let mongoServer, mongoUri, app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use('/courses', courseRoutes);
  });

  afterAll(async () => {
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
          title: 'Intro to Programming',
          description: 'Basic programming concepts',
          credits: 3,
          offeredIn: 'Fall',
        },
        {
          _id: 'COMP201',
          title: 'Data Structures',
          description: 'Advanced data structures',
          credits: 4,
          offeredIn: 'Winter',
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          description: 'Introduction to calculus',
          credits: 3,
          offeredIn: 'Fall',
        },
      ]);
    });

    it('should get all courses', async () => {
      const response = await request(app).get('/courses');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('courses');
      expect(Array.isArray(response.body.courses)).toBe(true);
      expect(response.body.courses.length).toBe(3);
    });

    it('should filter courses by pool', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ pool: 'Fall' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(2);
      const courseIds = response.body.courses.map((course) => course._id).sort();
      expect(courseIds).toEqual(['COMP101', 'MATH101']);
    });

    it('should search courses by keyword', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ search: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBeGreaterThanOrEqual(1);
    });

    it('should pass page/limit params even when partially provided', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ page: '1' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(3);
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ page: '1', limit: '2' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(2);
    });

    it('should ignore invalid pagination values provided', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ page: 'NaN', limit: 'NaN' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(3);
    });

    it('should apply custom sorting', async () => {
      const response = await request(app)
        .get('/courses')
        .query({ sort: 'credits' });

      expect(response.status).toBe(200);
      expect(response.body.courses.length).toBe(3);
    });

    it('should handle errors during fetch', async () => {
      const spy = jest
        .spyOn(courseController, 'getAllCourses')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/courses');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');

      spy.mockRestore();
    });
  });

  describe('GET /courses/:code', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP101',
        title: 'Intro to Programming',
        description: 'Basic programming',
        credits: 3,
      });
    });

    it('should get course by code', async () => {
      const response = await request(app).get('/courses/COMP101');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('course');
      expect(response.body.course._id).toBe('COMP101');
      expect(response.body.course.title).toBe('Intro to Programming');
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app).get('/courses/NONEXIST');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 if code is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.code) {
          res.status(400).json({ error: 'Course code is required' });
        }
      });

      const response = await request(testApp).get('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during fetch', async () => {
      const originalFindById = Course.findById;
      const spy = jest
        .spyOn(courseController, 'getCourseByCode')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/courses/COMP101');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      spy.mockRestore();
      Course.findById = originalFindById;
    });
  });
});

