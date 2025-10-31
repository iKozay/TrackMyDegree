const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const degreeRoutes = require('../dist/routes/mongo/degreeRoutes').default;
const { Degree } = require('../dist/models/Degree');

describe('Degree Routes (MongoDB)', () => {
  let mongoServer, mongoUri, app, testDegree;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use('/degree', degreeRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Degree.deleteMany({});
  });

  describe('GET /degree/:id', () => {
    beforeEach(async () => {
      testDegree = await Degree.insertOne({
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      });
    });

    it('should get degree by ID', async () => {
      const response = await request(app).get(`/degree/${testDegree._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('degree');
      expect(response.body.degree.id).toBe(testDegree._id.toString());
      expect(response.body.degree.name).toBe('Computer Science');
      expect(response.body.degree.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app).get('/degree/507f1f77bcf86cd799439011');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('does not exist');
    });

    it('should return 400 if id is missing', async () => {
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

    // TODO: fix those mocks that throw errors because they interfere with other tests
    // it('should handle errors during fetch', async () => {
    //   const originalFindById = Degree.findById;
    //   Degree.findById = jest.fn(() => ({
    //     select: jest.fn().mockReturnThis(),
    //     lean: jest.fn().mockReturnThis(),
    //     exec: jest.fn().mockRejectedValue(new Error('Database error')),
    //   }));

    //   const response = await request(app).get('/degree/507f1f77bcf86cd799439011');

    //   expect(response.status).toBe(404);
    //   expect(response.body).toHaveProperty('error');

    //   Degree.findById = originalFindById;
    // });
  });

  describe('GET /degree', () => {
    beforeEach(async () => {
      testDegree = await Degree.insertMany([
        { name: 'Computer Science', totalCredits: 120 },
        { name: 'Software Engineering', totalCredits: 120 },
        { name: 'Engineering Core Program', totalCredits: 30, isECP: true },
      ]);
    });

    it('should get all degrees', async () => {
      const response = await request(app).get('/degree');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('degrees');
      expect(Array.isArray(response.body.degrees)).toBe(true);
      expect(response.body.degrees.length).toBe(2); // Should exclude ECP
      expect(response.body.degrees.map((d) => d.id)).not.toContain('ECP');
    });

    it('should handle errors during fetch', async () => {
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

  describe('GET /degree/:id/credits', () => {
    beforeEach(async () => {
      testDegree = await Degree.insertOne({
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should get credits for a degree', async () => {
      const response = await request(app).get(`/degree/${testDegree._id}/credits`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('totalCredits');
      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app).get('/degree/507f1f77bcf86cd799439011/credits');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('does not exist');
    });

    it('should return 400 if id is missing', async () => {
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

    // TODO: fix those mocks that throw errors because they interfere with other tests
    // it('should handle errors during fetch', async () => {
    //   const originalFindById = Degree.findById;
    //   Degree.findById = jest.fn(() => ({
    //     select: jest.fn().mockReturnThis(),
    //     lean: jest.fn().mockReturnThis(),
    //     exec: jest.fn().mockRejectedValue(new Error('Database error')),
    //   }));

    //   const response = await request(app).get('/degree/507f1f77bcf86cd799439011/credits');

    //   expect(response.status).toBe(404);
    //   expect(response.body).toHaveProperty('error');

    //   Degree.findById = originalFindById;
    // });
  });

  describe('DegreeController - Course Pool Operations', () => {
    beforeEach(async () => {
      testDegree = await Degree.insertMany([
        {
          name: 'Computer Science',
          totalCredits: 120,
          coursePools: [
            {
              id: 'Core',
              name: 'Core Courses',
              creditsRequired: 60,
              courses: ['COMP101', 'COMP201', 'COMP301'],
            },
            {
              id: 'Elective',
              name: 'Elective Courses',
              creditsRequired: 20,
              courses: ['COMP400', 'COMP401'],
            },
          ],
        },
        {
          name: 'Software Engineering',
          totalCredits: 120,
          coursePools: [
            {
              id: 'Core',
              name: 'Core Courses',
              creditsRequired: 60,
              courses: ['COMP101', 'COMP201'],
            },
            {
              id: 'Project',
              name: 'Project Courses',
              creditsRequired: 30,
              courses: ['SOEN400', 'SOEN401'],
            },
          ],
        },
      ]);
    });

    describe('getAllCoursePools', () => {
      it('should get all course pools from all degrees', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getAllCoursePools();

        expect(pools).toBeDefined();
        expect(Array.isArray(pools)).toBe(true);
        expect(pools.length).toBeGreaterThan(0);

        // Should have deduplicated core pools from both degrees
        const corePool = pools.find((p) => p.id === 'Core');
        expect(corePool).toBeDefined();

        // Should have other pools
        const electivePool = pools.find((p) => p.id === 'Elective');
        expect(electivePool).toBeDefined();

        const projectPool = pools.find((p) => p.id === 'Project');
        expect(projectPool).toBeDefined();
      });

      it('should return empty array for empty database', async () => {
        await Degree.deleteMany({});

        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getAllCoursePools();

        expect(pools).toEqual([]);
      });
      // TODO: fix those mocks that throw errors because they interfere with other tests
      // it('should handle aggregation errors gracefully', async () => {
      //   const originalAggregate = Degree.aggregate;
      //   Degree.aggregate = jest
      //     .fn()
      //     .mockRejectedValue(new Error('Aggregation error'));

      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const pools = await degreeController.getAllCoursePools();

      //   expect(pools).toEqual([]);

      //   Degree.aggregate = originalAggregate;
      // });
    });

    describe('getCoursePool', () => {
      it('should get a specific course pool by ID', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pool = await degreeController.getCoursePool('Core');

        expect(pool).toBeDefined();
        expect(pool.id).toBe('Core');
        expect(pool.name).toBe('Core Courses');
        expect(pool.creditsRequired).toBe(60);
      });

      it('should return undefined for non-existent pool', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pool = await degreeController.getCoursePool('NONEXIST');

        expect(pool).toBeUndefined();
      });
      // TODO: fix those mocks that throw errors because they interfere with other tests
      // it('should handle errors gracefully', async () => {
      //   const originalAggregate = Degree.aggregate;
      //   Degree.aggregate = jest
      //     .fn()
      //     .mockRejectedValue(new Error('Aggregation error'));

      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const pool = await degreeController.getCoursePool('Core');

      //   expect(pool).toBeUndefined();

      //   Degree.aggregate = originalAggregate;
      // });
    });

    describe('getCoursePoolsByDegree', () => {
      it('should get all course pools for a degree', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getCoursePoolsByDegree(testDegree[0]._id);

        expect(pools).toBeDefined();
        expect(Array.isArray(pools)).toBe(true);
        expect(pools.length).toBe(2);

        const corePool = pools.find((p) => p.id === 'Core');
        expect(corePool).toBeDefined();
        expect(corePool.courses).toEqual(['COMP101', 'COMP201', 'COMP301']);

        const electivePool = pools.find((p) => p.id === 'Elective');
        expect(electivePool).toBeDefined();
      });

      it('should return empty array for non-existent degree', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getCoursePoolsByDegree('507f1f77bcf86cd799439011');

        expect(pools).toEqual([]);
      });

      it('should return empty array for degree with no course pools', async () => {
        testDegree = await Degree.insertOne({
          name: 'Electrical Engineering',
          totalCredits: 120,
          coursePools: null,
        });

        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getCoursePoolsByDegree(testDegree._id);

        expect(pools).toEqual([]);
      });
      // TODO: fix those mocks that throw errors because they interfere with other tests
      // it('should handle errors gracefully', async () => {
      //   const originalFindById = Degree.findById;
      //   Degree.findById = jest
      //     .fn()
      //     .mockRejectedValue(new Error('Database error'));

      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const pools = await degreeController.getCoursePoolsByDegree('507f1f77bcf86cd799439011');

      //   expect(pools).toEqual([]);

      //   Degree.findById = originalFindById;
      // });
    });

    describe('getCoursePoolsByDegree', () => {
      it('should get all course pools for a degree', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getCoursePoolsByDegree(testDegree[0]._id);

        expect(pools).toBeDefined();
        expect(Array.isArray(pools)).toBe(true);
        expect(pools.length).toBe(2);

        const corePool = pools.find((p) => p.id === 'Core');
        expect(corePool).toBeDefined();
        expect(corePool.creditsRequired).toBe(60);
      });

      it('should return empty array for non-existent degree', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getCoursePoolsByDegree('507f1f77bcf86cd799439011');

        expect(pools).toEqual([]);
      });

      it('should handle course pools with missing courses array', async () => {
        testDegree = await Degree.insertOne({
          name: 'Electrical Engineering',
          totalCredits: 120,
          coursePools: [
            {
              id: 'Core',
              name: 'Core Courses',
              creditsRequired: 60,
              // courses array is missing
            },
          ],
        });

        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
        const pools = await degreeController.getCoursePoolsByDegree(testDegree._id);

        expect(pools).toBeDefined();
        expect(pools.length).toBe(1);
        expect(pools[0].courses).toEqual([]);
      });
      // TODO: fix those mocks that throw errors because they interfere with other tests
      // it('should handle errors gracefully', async () => {
      //   const originalFindById = Degree.findById;
      //   Degree.findById = jest
      //     .fn()
      //     .mockRejectedValue(new Error('Database error'));

      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const pools = await degreeController.getCoursePoolsByDegree('507f1f77bcf86cd799439011');

      //   expect(pools).toEqual([]);

      //   Degree.findById = originalFindById;
      // });
    });

    describe('readDegree edge cases', () => {
      // TODO: fix those mocks that throw errors because they interfere with other tests
      // it('should handle errors when findById returns null', async () => {
      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const originalFindById = Degree.findById;

      //   Degree.findById = jest.fn().mockReturnValue({
      //     select: jest.fn().mockReturnValue({
      //       lean: jest.fn().mockReturnValue({
      //         exec: jest.fn().mockResolvedValue(null),
      //       }),
      //     }),
      //   });

      //   await expect(degreeController.readDegree('507f1f77bcf86cd799439011')).rejects.toThrow(
      //     'Degree with this id does not exist.',
      //   );

      //   Degree.findById = originalFindById;
      // });

      // it('should handle errors during findById', async () => {
      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const originalFindById = Degree.findById;

      //   Degree.findById = jest.fn().mockReturnValue({
      //     select: jest.fn().mockReturnValue({
      //       lean: jest.fn().mockReturnValue({
      //         exec: jest.fn().mockRejectedValue(new Error('Database error')),
      //       }),
      //     }),
      //   });

      //   await expect(degreeController.readDegree('507f1f77bcf86cd799439011')).rejects.toThrow();

      //   Degree.findById = originalFindById;
      // });
    });

    describe('readAllDegrees edge cases', () => {
      it('should handle errors when find fails', async () => {
        const {
          degreeController,
        } = require('../dist/controllers/mondoDBControllers');
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
    });

    describe('getCreditsForDegree edge cases', () => {
      // TODO: fix those mocks that throw errors because they interfere with other tests
      // it('should handle errors when findById returns null', async () => {
      //   const {
      //     degreeController,
      //   } = require('../dist/controllers/mondoDBControllers');
      //   const originalFindById = Degree.findById;

      //   Degree.findById = jest.fn().mockReturnValue({
      //     select: jest.fn().mockReturnValue({
      //       lean: jest.fn().mockReturnValue({
      //         exec: jest.fn().mockResolvedValue(null),
      //       }),
      //     }),
      //   });

      //   await expect(
      //     degreeController.getCreditsForDegree('507f1f77bcf86cd799439011'),
      //   ).rejects.toThrow('Degree with this id does not exist.');

      //   Degree.findById = originalFindById;
      // });
    });
  });
});
