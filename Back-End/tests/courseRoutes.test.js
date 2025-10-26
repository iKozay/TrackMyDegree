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

  describe('GET /courses/pool/:poolName', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          offeredIn: ['Fall', 'Winter']
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          offeredIn: ['Winter', 'Summer']
        },
        {
          _id: 'MATH101',
          title: 'Calculus I',
          offeredIn: ['Fall', 'Winter', 'Summer']
        }
      ]);
    });

    it('should get courses by pool', async () => {
      const response = await request(app)
        .get('/courses/pool/Fall')
        .expect(200);

      expect(response.body.message).toBe('Courses retrieved successfully');
      expect(response.body.courses).toHaveLength(2);
      expect(response.body.courses.every(course => course.offeredIn.includes('Fall'))).toBe(true);
    });

    it('should return empty array for non-existent pool', async () => {
      const response = await request(app)
        .get('/courses/pool/NonExistent')
        .expect(200);

      expect(response.body.courses).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      // Mock courseController.getCoursesByPool to throw an error
      const originalGetCoursesByPool = require('../dist/controllers/mondoDBControllers/CourseController').courseController.getCoursesByPool;
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getCoursesByPool = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/courses/pool/Fall')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getCoursesByPool = originalGetCoursesByPool;
    });
  });

  describe('POST /courses/requisite', () => {
    beforeEach(async () => {
      await Course.create([
        {
          _id: 'COMP101',
          title: 'Introduction to Programming',
          prerequisites: [],
          corequisites: []
        },
        {
          _id: 'COMP102',
          title: 'Data Structures',
          prerequisites: [],
          corequisites: []
        }
      ]);
    });

    it('should create prerequisite requisite', async () => {
      const response = await request(app)
        .post('/courses/requisite')
        .send({
          code1: 'COMP102',
          code2: 'COMP101',
          type: 'pre'
        })
        .expect(201);

      expect(response.body.message).toBe('Requisite created successfully');
      expect(response.body.requisite).toMatchObject({
        code1: 'COMP102',
        code2: 'COMP101',
        type: 'pre'
      });
    });

    it('should create corequisite requisite', async () => {
      const response = await request(app)
        .post('/courses/requisite')
        .send({
          code1: 'COMP101',
          code2: 'COMP102',
          type: 'co'
        })
        .expect(201);

      expect(response.body.message).toBe('Requisite created successfully');
      expect(response.body.requisite).toMatchObject({
        code1: 'COMP101',
        code2: 'COMP102',
        type: 'co'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/courses/requisite')
        .send({
          code1: 'COMP102',
          // Missing code2 and type
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields: code1, code2, type');
    });

    it('should return 400 for invalid requisite type', async () => {
      const response = await request(app)
        .post('/courses/requisite')
        .send({
          code1: 'COMP102',
          code2: 'COMP101',
          type: 'invalid'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid requisite type. Must be "pre" or "co"');
    });

    it('should return 404 when course does not exist', async () => {
      const response = await request(app)
        .post('/courses/requisite')
        .send({
          code1: 'NONEXISTENT',
          code2: 'COMP101',
          type: 'pre'
        })
        .expect(404);

      expect(response.body.error).toBe('One or both courses do not exist');
    });

    it('should handle server errors', async () => {
      // Mock courseController.createRequisite to throw an error
      const originalCreateRequisite = require('../dist/controllers/mondoDBControllers/CourseController').courseController.createRequisite;
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.createRequisite = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/courses/requisite')
        .send({
          code1: 'COMP102',
          code2: 'COMP101',
          type: 'pre'
        })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.createRequisite = originalCreateRequisite;
    });
  });

  describe('GET /courses/:code/requisites', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP102',
        title: 'Data Structures',
        prerequisites: ['COMP101', 'MATH101'],
        corequisites: ['COMP103']
      });
    });

    it('should get all requisites for course', async () => {
      const response = await request(app)
        .get('/courses/COMP102/requisites')
        .expect(200);

      expect(response.body.message).toBe('Requisites retrieved successfully');
      expect(response.body.requisites).toHaveLength(3);
      
      const prerequisites = response.body.requisites.filter(r => r.type === 'pre');
      const corequisites = response.body.requisites.filter(r => r.type === 'co');

      expect(prerequisites).toHaveLength(2);
      expect(corequisites).toHaveLength(1);
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/courses/NONEXISTENT/requisites')
        .expect(404);

      expect(response.body.error).toBe('Course not found');
    });

    it('should handle server errors', async () => {
      // Mock courseController.getRequisites to throw an error
      const originalGetRequisites = require('../dist/controllers/mondoDBControllers/CourseController').courseController.getRequisites;
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getRequisites = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/courses/COMP102/requisites')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.getRequisites = originalGetRequisites;
    });
  });

  describe('DELETE /courses/:code1/requisite/:code2', () => {
    beforeEach(async () => {
      await Course.create({
        _id: 'COMP102',
        title: 'Data Structures',
        prerequisites: ['COMP101', 'MATH101'],
        corequisites: ['COMP103']
      });
    });

    it('should delete prerequisite', async () => {
      const response = await request(app)
        .delete('/courses/COMP102/requisite/COMP101')
        .query({ type: 'pre' })
        .expect(200);

      expect(response.body.message).toBe('Requisite deleted successfully');
    });

    it('should delete corequisite', async () => {
      const response = await request(app)
        .delete('/courses/COMP102/requisite/COMP103')
        .query({ type: 'co' })
        .expect(200);

      expect(response.body.message).toBe('Requisite deleted successfully');
    });

    it('should return 400 for missing type parameter', async () => {
      const response = await request(app)
        .delete('/courses/COMP102/requisite/COMP101')
        .expect(400);

      expect(response.body.error).toBe('Missing required parameter: type');
    });

    it('should return 400 for invalid type parameter', async () => {
      const response = await request(app)
        .delete('/courses/COMP102/requisite/COMP101')
        .query({ type: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Invalid requisite type. Must be "pre" or "co"');
    });

    it('should return 404 when requisite not found', async () => {
      const response = await request(app)
        .delete('/courses/COMP102/requisite/NONEXISTENT')
        .query({ type: 'pre' })
        .expect(404);

      expect(response.body.error).toBe('Requisite not found');
    });

    it('should handle server errors', async () => {
      // Mock courseController.deleteRequisite to throw an error
      const originalDeleteRequisite = require('../dist/controllers/mondoDBControllers/CourseController').courseController.deleteRequisite;
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.deleteRequisite = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/courses/COMP102/requisite/COMP101')
        .query({ type: 'pre' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/CourseController').courseController.deleteRequisite = originalDeleteRequisite;
    });
  });
});
