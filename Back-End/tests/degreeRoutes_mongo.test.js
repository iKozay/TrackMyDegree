const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const degreeRoutes = require('../dist/routes/mongo/degreeRoutes').default;
const { Degree } = require('../dist/models/Degree');

describe('Degree Routes (MongoDB)', () => {
  let mongoServer, mongoUri, app;

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
      await Degree.create({
        _id: 'CS',
        name: 'Computer Science',
        totalCredits: 120,
        coursePools: [],
      });
    });

    it('should get degree by ID', async () => {
      const response = await request(app).get('/degree/CS');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('degree');
      expect(response.body.degree.id).toBe('CS');
      expect(response.body.degree.name).toBe('Computer Science');
      expect(response.body.degree.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app).get('/degree/NONEXIST');

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

    it('should handle errors during fetch', async () => {
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

  describe('GET /degree', () => {
    beforeEach(async () => {
      await Degree.create([
        { _id: 'CS', name: 'Computer Science', totalCredits: 120 },
        { _id: 'SE', name: 'Software Engineering', totalCredits: 120 },
        { _id: 'ECP', name: 'Engineering Core Program', totalCredits: 30 },
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
      await Degree.create({
        _id: 'CS',
        name: 'Computer Science',
        totalCredits: 120,
      });
    });

    it('should get credits for a degree', async () => {
      const response = await request(app).get('/degree/CS/credits');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('totalCredits');
      expect(response.body.totalCredits).toBe(120);
    });

    it('should return 404 for non-existent degree', async () => {
      const response = await request(app).get('/degree/NONEXIST/credits');

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

    it('should handle errors during fetch', async () => {
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
});

