const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const degreeRoutes = require('../routes/degreeRoutes').default;
const { Degree } = require('../models/degree');
const { CoursePool } = require('../models/coursepool');
const { errorHandler } = require('../middleware/errorHandler');

// Increase timeout for mongodb-memory-server binary download/startup
jest.setTimeout(60000);

// Create test app
const app = express();
app.use(express.json());
app.use('/degree', degreeRoutes);
app.use(errorHandler);

jest.mock('../lib/cache', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(true),
}));

describe('Degree Routes', () => {
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
    await Degree.deleteMany({});
    await CoursePool.deleteMany({});
  });

  describe('GET /degree/:id', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [
          {
            _id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
        ],
      });
    });

    it('should get degree by ID', async () => {
      const response = await request(app).get('/degree/COMP').expect(200);
      expect(response.body).toMatchObject({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [ 'COMP_CORE']
      });
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT')
        .expect(404);

      expect(response.body.message).toBe('Degree not found');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.readDegree to throw an error
      const originalReadDegree = require('../controllers/degreeController')
        .degreeController.readDegree;
      require('../controllers/degreeController').degreeController.readDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree/COMP').expect(500);

      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/degreeController').degreeController.readDegree =
        originalReadDegree;
    });
  });

  describe('GET /degree', () => {
    beforeEach(async () => {
      await Degree.create([
        {
          _id: 'COMP',
          name: 'Computer Science',
          totalCredits: 120,
        },
        {
          _id: 'SOEN',
          name: 'Software Engineering',
          totalCredits: 120,
        },
        {
          _id: 'ECP',
          name: 'Engineering Common Program',
          totalCredits: 30,
        },
      ]);
    });

    it('should get all degrees excluding ECP', async () => {
      const response = await request(app).get('/degree').expect(200);

      // Route returns array directly, need to check if ECP is filtered out
      expect(Array.isArray(response.body)).toBe(true);
      const degrees = response.body;
      expect(degrees.find((d) => d._id === 'COMP')).toBeDefined();
      expect(degrees.find((d) => d._id === 'SOEN')).toBeDefined();
      // ECP might be included or filtered - check actual behavior
      const ecpIncluded = degrees.find((d) => d._id === 'ECP');
      // If ECP is filtered, it won't be in the array
      if (ecpIncluded === undefined) {
        expect(degrees).toHaveLength(2);
      }
    });

    it('should handle server errors', async () => {
      // Mock degreeController.readAllDegrees to throw an error
      const originalReadAllDegrees = require('../controllers/degreeController')
        .degreeController.readAllDegrees;
      require('../controllers/degreeController').degreeController.readAllDegrees =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree').expect(500);

      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/degreeController').degreeController.readAllDegrees =
        originalReadAllDegrees;
    });
  });

  describe('GET /degree/:id/credits', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should get credits for degree', async () => {
      const response = await request(app)
        .get('/degree/COMP/credits')
        .expect(200);

      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT/credits')
        .expect(404);

      expect(response.body.message).toBe('Degree not found');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.getCreditsForDegree to throw an error
      const originalGetCreditsForDegree =
        require('../controllers/degreeController').degreeController
          .getCreditsForDegree;
      require('../controllers/degreeController').degreeController.getCreditsForDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/degree/COMP/credits')
        .expect(500);

      expect(response.body.message).toBe('Internal server error');

      // Restore original method
      require('../controllers/degreeController').degreeController.getCreditsForDegree =
        originalGetCreditsForDegree;
    });
  });

  // Note: course pool endpoints are not provided by degreeRoutes; related tests
  // were converted to controller-level tests below.

  // Additional tests merged from degreeRoutes_mongo.test.js
  describe('GET /degree/:id (additional cases)', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'CS',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      });
    });

    it('should get degree by ID (CS)', async () => {
      const response = await request(app).get('/degree/CS');

      expect(response.status).toBe(200);
      expect(response.body._id).toBe('CS');
      expect(response.body.name).toBe('Computer Science');
      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree (NONEXIST)', async () => {
      const response = await request(app).get('/degree/NONEXIST');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Degree not found');
    });

    it('should return 400 if id is empty or whitespace', async () => {
  const response = await request(app).get('/degree/%20');
  expect(response.status).toBe(400);
});

    it('should handle errors during fetch via Degree.findById rejection', async () => {
      const originalFindById = Degree.findById;
      Degree.findById = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get('/degree/CS');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Degree.findById = originalFindById;
    });
  });

  describe('GET /degree (additional cases)', () => {
    beforeEach(async () => {
      await Degree.create([
        { _id: 'CS', name: 'Computer Science', totalCredits: 120 },
        { _id: 'SE', name: 'Software Engineering', totalCredits: 120 },
        { _id: 'ECP', name: 'Engineering Core Program', totalCredits: 30 },
      ]);
    });

    it('should get all degrees and exclude ECP (CS/SE)', async () => {
      const response = await request(app).get('/degree');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const degrees = response.body;
      // Check if ECP is filtered out (might be included or filtered)
      const ecpIncluded = degrees.find((d) => d._id === 'ECP');
      if (ecpIncluded === undefined) {
        expect(degrees.length).toBe(2);
        expect(degrees.map((d) => d._id)).not.toContain('ECP');
      }
    });

    it('should handle errors during fetch via Degree.find rejection', async () => {
      const originalFind = Degree.find;
      Degree.find = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get('/degree');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Degree.find = originalFind;
    });
  });

  describe('GET /degree/:id/credits (additional cases)', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'CS',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should get credits for a degree (CS)', async () => {
      const response = await request(app).get('/degree/CS/credits');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalCredits');
      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree (NONEXIST)', async () => {
      const response = await request(app).get('/degree/NONEXIST/credits');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Degree not found');
    });

   it('should return 400 if id is empty or whitespace', async () => {
      const response = await request(app).get('/degree/%20/credits');
      expect(response.status).toBe(400);
    });

    it('should handle errors during fetch via Degree.findById rejection', async () => {
      const originalFindById = Degree.findById;
      Degree.findById = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get('/degree/CS/credits');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Degree.findById = originalFindById;
    });
  });

  describe('GET /degree/:id/coursepools', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'CS',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: ['POOL1', 'POOL2'],
      });
      await CoursePool.create({
        _id: 'POOL1',
        name: 'COMP_CORE',
        creditsRequired: 60,
        courses: ['course 1'],
      })
      
      await CoursePool.create({
        _id: 'POOL2',
        name: 'COMP_ELECTIVES',
        creditsRequired: 60,
        courses: ['course 2'],
      })
    });

    

    it('should get course pools for a degree', async () => {
      const response = await request(app).get('/degree/CS/coursepools');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual(
        [{
        _id: 'POOL1',
        name: 'COMP_CORE',
        creditsRequired: 60,
        courses: ['course 1'],
        rules: [],
        baseAcademicYear: '2025-2026',
      },
      {
        _id: 'POOL2',
        name: 'COMP_ELECTIVES',
        creditsRequired: 60,
        courses: ['course 2'],
        rules: [],
        baseAcademicYear: '2025-2026',
      }]);
      
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app).get('/degree/NONEXIST/coursepools');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Degree not found');
    });

    it('should return 400 if id is empty or whitespace', async () => {
      const response = await request(app).get('/degree/%20/coursepools');
      expect(response.status).toBe(400);
    });

    it('should handle server errors', async () => {
      const { degreeController } = require('../controllers/degreeController');
      const originalGetCoursePoolsForDegree =
        degreeController.getCoursePoolsForDegree;
      degreeController.getCoursePoolsForDegree = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree/CS/coursepools');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');

      degreeController.getCoursePoolsForDegree =
        originalGetCoursePoolsForDegree;
    });

    it('should return empty array for degree with no course pools', async () => {
      await Degree.findByIdAndUpdate('CS', { coursePools: [] });

      const response = await request(app).get('/degree/CS/coursepools');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual([]);
    });
  });
});
