const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const coursepoolRoutes = require('../routes/coursepoolRoutes').default;
const { CoursePool } = require('../models/coursepool');

// Increase timeout for mongodb-memory-server binary download/startup
jest.setTimeout(60000);

// Create test app
const app = express();
app.use(express.json());
app.use('/coursepool', coursepoolRoutes);

describe('Coursepool Routes', () => {
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
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await CoursePool.deleteMany({});
  });

  describe('GET /coursepool/:id', () => {
    it('should retrieve a course pool by ID', async () => {
      await CoursePool.create({
        _id: 'CP101',
        name: 'Core Courses',
        creditsRequired: 30,
        courses: ['CS101', 'CS102', 'CS103'],
      });
      const response = await request(app).get('/coursepool/CP101');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: 'CP101',
        name: 'Core Courses',
        creditsRequired: 30,
        courses: ['CS101', 'CS102', 'CS103'],
      });
    });

    it('should return 404 if course pool not found', async () => {
      const response = await request(app).get('/coursepool/NonExistentID');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Course pool not found');
    });

    it('should handle server errors', async () => {
      const originalGetCoursePool =
        require('../controllers/coursepoolController').coursepoolController
          .getCoursePool;

      require('../controllers/coursepoolController').coursepoolController.getCoursePool =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/coursepool/CP101');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');

      require('../controllers/coursepoolController').coursepoolController.getCoursePool =
        originalGetCoursePool;
    });
  });

  describe('GET /coursepool', () => {
    it('should retrieve all course pools', async () => {
      await CoursePool.create([
        {
          _id: 'CP101',
          name: 'Core Courses',
          creditsRequired: 30,
          courses: ['CS101', 'CS102', 'CS103'],
        },
        {
          _id: 'CP102',
          name: 'Elective Courses',
          creditsRequired: 15,
          courses: ['CS201', 'CS202'],
        },
      ]);

      const response = await request(app).get('/coursepool');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: 'CP101',
            name: 'Core Courses',
            creditsRequired: 30,
            courses: ['CS101', 'CS102', 'CS103'],
          }),
          expect.objectContaining({
            _id: 'CP102',
            name: 'Elective Courses',
            creditsRequired: 15,
            courses: ['CS201', 'CS202'],
          }),
        ]),
      );
    });

    it('should return empty array when no course pools exist', async () => {
      const response = await request(app).get('/coursepool');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      const originalGetAllCoursePools =
        require('../controllers/coursepoolController').coursepoolController
          .getAllCoursePools;

      require('../controllers/coursepoolController').coursepoolController.getAllCoursePools =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/coursepool');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');

      require('../controllers/coursepoolController').coursepoolController.getAllCoursePools =
        originalGetAllCoursePools;
    });
  });
});
