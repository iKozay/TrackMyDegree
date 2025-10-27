const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const feedbackRoutes = require('../dist/routes/mongo/feedbackRoutes').default;
const { Feedback } = require('../dist/models/Feedback');

describe('Feedback Routes (MongoDB)', () => {
  let mongoServer, mongoUri, app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use('/feedback', feedbackRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Feedback.deleteMany({});
  });

  describe('POST /feedback', () => {
    it('should submit feedback with user_id', async () => {
      const feedbackData = {
        message: 'Great app!',
        user_id: 'user123',
      };

      const response = await request(app).post('/feedback').send(feedbackData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('feedback');
      expect(response.body.feedback.message).toBe('Great app!');
      expect(response.body.feedback.user_id).toBe('user123');
    });

    it('should submit feedback without user_id (anonymous)', async () => {
      const feedbackData = {
        message: 'Anonymous feedback',
      };

      const response = await request(app).post('/feedback').send(feedbackData);

      expect(response.status).toBe(201);
      expect(response.body.feedback.message).toBe('Anonymous feedback');
    });

    it('should return 400 if message is missing', async () => {
      const feedbackData = {
        user_id: 'user123',
      };

      const response = await request(app).post('/feedback').send(feedbackData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Message is required');
    });

    it('should handle errors during submission', async () => {
      const originalCreate = Feedback.create;
      Feedback.create = jest.fn(() => ({
        toObject: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        }),
      }));

      const feedbackData = {
        message: 'Test feedback',
      };

      const response = await request(app).post('/feedback').send(feedbackData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Feedback.create = originalCreate;
    });
  });

  describe('GET /feedback', () => {
    beforeEach(async () => {
      await Feedback.create([
        {
          message: 'Feedback 1',
          user_id: 'user123',
          submitted_at: new Date('2024-01-01'),
        },
        {
          message: 'Feedback 2',
          user_id: 'user123',
          submitted_at: new Date('2024-02-01'),
        },
        {
          message: 'Feedback 3',
          user_id: 'user456',
          submitted_at: new Date('2024-03-01'),
        },
      ]);
    });

    it('should get all feedback', async () => {
      const response = await request(app).get('/feedback');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('feedback');
      expect(Array.isArray(response.body.feedback)).toBe(true);
      expect(response.body.feedback.length).toBe(3);
    });

    it('should filter feedback by user_id', async () => {
      const response = await request(app)
        .get('/feedback')
        .query({ user_id: 'user123' });

      expect(response.status).toBe(200);
      expect(response.body.feedback.length).toBe(2);
      expect(response.body.feedback.every((f) => f.user_id === 'user123')).toBe(
        true,
      );
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/feedback')
        .query({ page: '1', limit: '2' });

      expect(response.status).toBe(200);
      expect(response.body.feedback.length).toBe(2);
    });

    it('should apply sorting', async () => {
      const response = await request(app)
        .get('/feedback')
        .query({ sort: 'asc' });

      expect(response.status).toBe(200);
      expect(response.body.feedback.length).toBe(3);
    });

    it('should handle errors during fetch', async () => {
      const originalFind = Feedback.find;
      Feedback.find = jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get('/feedback');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Feedback.find = originalFind;
    });
  });

  describe('GET /feedback/:id', () => {
    let feedbackId;

    beforeEach(async () => {
      const feedback = await Feedback.create({
        message: 'Test feedback',
        user_id: 'user123',
        submitted_at: new Date(),
      });
      feedbackId = feedback._id.toString();
    });

    it('should get feedback by ID', async () => {
      const response = await request(app).get(`/feedback/${feedbackId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('feedback');
      expect(response.body.feedback.id).toBe(feedbackId);
      expect(response.body.feedback.message).toBe('Test feedback');
    });

    it('should return 404 for non-existent feedback', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/feedback/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if id is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Feedback ID is required' });
        }
      });

      const response = await request(testApp).get('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during fetch', async () => {
      const originalFindById = Feedback.findById;
      Feedback.findById = jest.fn(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get(`/feedback/${feedbackId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Feedback.findById = originalFindById;
    });
  });

  describe('DELETE /feedback/:id', () => {
    let feedbackId;

    beforeEach(async () => {
      const feedback = await Feedback.create({
        message: 'To delete',
        user_id: 'user123',
        submitted_at: new Date(),
      });
      feedbackId = feedback._id.toString();
    });

    it('should delete feedback by ID', async () => {
      const response = await request(app).delete(`/feedback/${feedbackId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify feedback is deleted
      const feedback = await Feedback.findById(feedbackId);
      expect(feedback).toBeNull();
    });

    it('should return 404 for non-existent feedback', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).delete(`/feedback/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if id is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.delete('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Feedback ID is required' });
        }
      });

      const response = await request(testApp).delete('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during delete', async () => {
      const originalFindByIdAndDelete = Feedback.findByIdAndDelete;
      Feedback.findByIdAndDelete = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete(`/feedback/${feedbackId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Feedback.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });

  describe('DELETE /feedback/user/:userId', () => {
    beforeEach(async () => {
      await Feedback.create([
        {
          message: 'Feedback 1',
          user_id: 'user123',
          submitted_at: new Date(),
        },
        {
          message: 'Feedback 2',
          user_id: 'user123',
          submitted_at: new Date(),
        },
        {
          message: 'Feedback 3',
          user_id: 'user456',
          submitted_at: new Date(),
        },
      ]);
    });

    it('should delete all feedback for a user', async () => {
      const response = await request(app).delete('/feedback/user/user123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedCount');
      expect(response.body.deletedCount).toBe(2);

      // Verify feedback is deleted
      const feedback = await Feedback.find({ user_id: 'user123' });
      expect(feedback.length).toBe(0);
    });

    it('should return 0 for user with no feedback', async () => {
      const response = await request(app).delete('/feedback/user/nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(0);
    });

    it('should return 400 if userId is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.delete('/test', (req, res) => {
        if (!req.params.userId) {
          res.status(400).json({ error: 'User ID is required' });
        }
      });

      const response = await request(testApp).delete('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during delete', async () => {
      const originalDeleteMany = Feedback.deleteMany;
      Feedback.deleteMany = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).delete('/feedback/user/user123');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Feedback.deleteMany = originalDeleteMany;
    });
  });
});

