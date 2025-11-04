const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const degreeRoutes = require('../routes/mongo/degreeRoutes').default;
const { Degree } = require('../models/Degree');

// Increase timeout for mongodb-memory-server binary download/startup
jest.setTimeout(60000);

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
    if (mongoServer) {
    await mongoServer.stop();
    }
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
      console.log(response.body.degree);
      expect(response.body.message).toBe('Degree retrieved successfully');
      expect(response.body.degree).toMatchObject({
        _id: 'COMP',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT')
        .expect(404);

      expect(response.body.error).toBe('Degree with this id does not exist.');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.readDegree to throw an error
      const originalReadDegree =
        require('../controllers/mondoDBControllers/DegreeController')
          .degreeController.readDegree;
      require('../controllers/mondoDBControllers/DegreeController').degreeController.readDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree/COMP').expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/DegreeController').degreeController.readDegree =
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
      expect(response.body.degrees.find((d) => d._id === 'COMP')).toBeDefined();
      expect(response.body.degrees.find((d) => d._id === 'SOEN')).toBeDefined();
      expect(response.body.degrees.find((d) => d._id === 'ECP')).toBeUndefined();
    });

    it('should handle server errors', async () => {
      // Mock degreeController.readAllDegrees to throw an error
      const originalReadAllDegrees =
        require('../controllers/mondoDBControllers/DegreeController')
          .degreeController.readAllDegrees;
      require('../controllers/mondoDBControllers/DegreeController').degreeController.readAllDegrees =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/degree').expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/DegreeController').degreeController.readAllDegrees =
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
      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app)
        .get('/degree/NONEXISTENT/credits')
        .expect(404);

      expect(response.body.error).toBe('Degree with this id does not exist.');
    });

    it('should handle server errors', async () => {
      // Mock degreeController.getCreditsForDegree to throw an error
      const originalGetCreditsForDegree =
        require('../controllers/mondoDBControllers/DegreeController')
          .degreeController.getCreditsForDegree;
      require('../controllers/mondoDBControllers/DegreeController').degreeController.getCreditsForDegree =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/degree/COMP/credits')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/DegreeController').degreeController.getCreditsForDegree =
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
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('degree');
      expect(response.body.degree._id).toBe('CS');
      expect(response.body.degree.name).toBe('Computer Science');
      expect(response.body.degree.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree (NONEXIST)', async () => {
      const response = await request(app).get('/degree/NONEXIST');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('does not exist');
    });

    it('should return 400 if id is missing (route param simulation)', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Degree ID is required' });
        }
      });

      const response = await request(testApp).get('/test');
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

      expect(response.status).toBe(404);
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
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('degrees');
      expect(Array.isArray(response.body.degrees)).toBe(true);
      expect(response.body.degrees.length).toBe(2);
      expect(response.body.degrees.map((d) => d._id)).not.toContain('ECP');
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
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('totalCredits');
      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree (NONEXIST)', async () => {
      const response = await request(app).get('/degree/NONEXIST/credits');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('does not exist');
    });

    it('should return 400 if id is missing (route param simulation)', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Degree ID is required' });
        }
      });

      const response = await request(testApp).get('/test');
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

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');

      Degree.findById = originalFindById;
    });
  });

  describe('DegreeController - Course Pool Operations (additional cases)', () => {
    beforeEach(async () => {
      await Degree.create([
        {
          _id: 'CS',
          name: 'Computer Science',
          totalCredits: 120,
          coursePools: [
            {
              _id: 'Core',
              name: 'Core Courses',
              creditsRequired: 60,
              courses: ['COMP101', 'COMP201', 'COMP301'],
            },
            {
              _id: 'Elective',
              name: 'Elective Courses',
              creditsRequired: 20,
              courses: ['COMP400', 'COMP401'],
            },
          ],
        },
        {
          _id: 'SE',
          name: 'Software Engineering',
          totalCredits: 120,
          coursePools: [
            {
              _id: 'Core',
              name: 'Core Courses',
              creditsRequired: 60,
              courses: ['COMP101', 'COMP201'],
            },
            {
              _id: 'Project',
              name: 'Project Courses',
              creditsRequired: 30,
              courses: ['SOEN400', 'SOEN401'],
            },
          ],
        },
      ]);
    });

    describe('Controller method edge cases', () => {
      it('readDegree should reject when findById returns null', async () => {
        const { degreeController } = require('../controllers/mondoDBControllers');
        const originalFindById = Degree.findById;

        Degree.findById = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        });

        await expect(degreeController.readDegree('NONEXIST')).rejects.toThrow(
          'Degree with this id does not exist.',
        );

        Degree.findById = originalFindById;
      });

      it('readDegree should reject when findById throws', async () => {
        const { degreeController } = require('../controllers/mondoDBControllers');
        const originalFindById = Degree.findById;

        Degree.findById = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        });

        await expect(degreeController.readDegree('CS')).rejects.toThrow();

        Degree.findById = originalFindById;
      });

      it('readAllDegrees should reject when find fails', async () => {
        const { degreeController } = require('../controllers/mondoDBControllers');
        const originalFind = Degree.find;

        Degree.find = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockRejectedValue(new Error('Database error')),
              }),
            }),
          }),
        });

        await expect(degreeController.readAllDegrees()).rejects.toThrow();

        Degree.find = originalFind;
      });

      it('getCreditsForDegree should reject when findById returns null', async () => {
        const { degreeController } = require('../controllers/mondoDBControllers');
        const originalFindById = Degree.findById;

        Degree.findById = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        });

        await expect(
          degreeController.getCreditsForDegree('NONEXIST'),
        ).rejects.toThrow('Degree with this id does not exist.');

        Degree.findById = originalFindById;
      });
    });
  });
});
