const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const degreeRoutes = require('../dist/routes/mongo/degreeRoutes').default;
const { Degree } = require('../dist/models/Degree');

// Create test app
const app = express();
app.use(express.json());
app.use('/degree', degreeRoutes);

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
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Degree.deleteMany({});
  });

  describe('GET /degree/:id', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
        ],
      });
    });

    it('should get degree by ID', async () => {
      const response = await request(app).get('/degree/COMP').expect(200);

      expect(response.body.message).toBe('Degree retrieved successfully');
      expect(response.body.degree).toMatchObject({
        id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT')
        .expect(404);

      expect(response.body.error).toBe('Degree not found');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.readDegree to throw an error
      const originalReadDegree =
        require('../dist/controllers/mondoDBControllers/DegreeController')
          .degreeController.readDegree;
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.readDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree/COMP').expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.readDegree =
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

      expect(response.body.message).toBe('Degrees retrieved successfully');
      expect(response.body.degrees).toHaveLength(2);
      expect(response.body.degrees.find((d) => d.id === 'COMP')).toBeDefined();
      expect(response.body.degrees.find((d) => d.id === 'SOEN')).toBeDefined();
      expect(response.body.degrees.find((d) => d.id === 'ECP')).toBeUndefined();
    });

    it('should handle server errors', async () => {
      // Mock degreeController.readAllDegrees to throw an error
      const originalReadAllDegrees =
        require('../dist/controllers/mondoDBControllers/DegreeController')
          .degreeController.readAllDegrees;
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.readAllDegrees =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree').expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.readAllDegrees =
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

      expect(response.body.message).toBe('Credits retrieved successfully');
      expect(response.body.credits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT/credits')
        .expect(404);

      expect(response.body.error).toBe('Degree not found');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.getCreditsForDegree to throw an error
      const originalGetCreditsForDegree =
        require('../dist/controllers/mondoDBControllers/DegreeController')
          .degreeController.getCreditsForDegree;
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getCreditsForDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/degree/COMP/credits')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getCreditsForDegree =
        originalGetCreditsForDegree;
    });
  });

  describe('GET /degree/coursepools', () => {
    beforeEach(async () => {
      await Degree.create([
        {
          _id: 'COMP',
          name: 'Computer Science',
          coursePools: [
            {
              id: 'COMP_CORE',
              name: 'Computer Science Core',
              creditsRequired: 60,
              courses: ['COMP101', 'COMP102'],
            },
            {
              id: 'MATH_REQ',
              name: 'Mathematics Requirements',
              creditsRequired: 12,
              courses: ['MATH101', 'MATH102'],
            },
          ],
        },
        {
          _id: 'SOEN',
          name: 'Software Engineering',
          coursePools: [
            {
              id: 'SOEN_CORE',
              name: 'Software Engineering Core',
              creditsRequired: 50,
              courses: ['SOEN101', 'SOEN102'],
            },
            {
              id: 'MATH_REQ',
              name: 'Mathematics Requirements',
              creditsRequired: 12,
              courses: ['MATH101', 'MATH102'],
            },
          ],
        },
      ]);
    });

    it('should get all course pools', async () => {
      const response = await request(app)
        .get('/degree/coursepools')
        .expect(200);

      expect(response.body.message).toBe('Course pools retrieved successfully');
      expect(response.body.coursePools).toHaveLength(3); // COMP_CORE, MATH_REQ, SOEN_CORE
      expect(
        response.body.coursePools.find((cp) => cp.id === 'COMP_CORE'),
      ).toBeDefined();
      expect(
        response.body.coursePools.find((cp) => cp.id === 'SOEN_CORE'),
      ).toBeDefined();
      expect(
        response.body.coursePools.find((cp) => cp.id === 'MATH_REQ'),
      ).toBeDefined();
    });

    it('should handle server errors', async () => {
      // Mock degreeController.getAllCoursePools to throw an error
      const originalGetAllCoursePools =
        require('../dist/controllers/mondoDBControllers/DegreeController')
          .degreeController.getAllCoursePools;
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getAllCoursePools =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/degree/coursepools')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getAllCoursePools =
        originalGetAllCoursePools;
    });
  });

  describe('GET /degree/coursepools/:poolId', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
        ],
      });
    });

    it('should get specific course pool', async () => {
      const response = await request(app)
        .get('/degree/coursepools/COMP_CORE')
        .expect(200);

      expect(response.body.message).toBe('Course pool retrieved successfully');
      expect(response.body.coursePool).toMatchObject({
        id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
    });

    it('should return 404 for non-existent course pool', async () => {
      const response = await request(app)
        .get('/degree/coursepools/NONEXISTENT')
        .expect(404);

      expect(response.body.error).toBe('Course pool not found');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.getCoursePool to throw an error
      const originalGetCoursePool =
        require('../dist/controllers/mondoDBControllers/DegreeController')
          .degreeController.getCoursePool;
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getCoursePool =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/degree/coursepools/COMP_CORE')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getCoursePool =
        originalGetCoursePool;
    });
  });

  describe('GET /degree/:id/coursepools', () => {
    beforeEach(async () => {
      await Degree.create({
        _id: 'COMP',
        name: 'Computer Science',
        coursePools: [
          {
            id: 'COMP_CORE',
            name: 'Computer Science Core',
            creditsRequired: 60,
            courses: ['COMP101', 'COMP102'],
          },
          {
            id: 'MATH_REQ',
            name: 'Mathematics Requirements',
            creditsRequired: 12,
            courses: ['MATH101', 'MATH102'],
          },
        ],
      });
    });

    it('should get course pools for specific degree', async () => {
      const response = await request(app)
        .get('/degree/COMP/coursepools')
        .expect(200);

      expect(response.body.message).toBe('Course pools retrieved successfully');
      expect(response.body.coursePools).toHaveLength(2);
      expect(response.body.coursePools[0]).toMatchObject({
        id: 'COMP_CORE',
        name: 'Computer Science Core',
        creditsRequired: 60,
        courses: ['COMP101', 'COMP102'],
      });
      expect(response.body.coursePools[1]).toMatchObject({
        id: 'MATH_REQ',
        name: 'Mathematics Requirements',
        creditsRequired: 12,
        courses: ['MATH101', 'MATH102'],
      });
    });

    it('should return empty array for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT/coursepools')
        .expect(200);

      expect(response.body.coursePools).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      // Mock degreeController.getCoursePoolsByDegree to throw an error
      const originalGetCoursePoolsByDegree =
        require('../dist/controllers/mondoDBControllers/DegreeController')
          .degreeController.getCoursePoolsByDegree;
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getCoursePoolsByDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/degree/COMP/coursepools')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/DegreeController').degreeController.getCoursePoolsByDegree =
        originalGetCoursePoolsByDegree;
    });
  });
});
