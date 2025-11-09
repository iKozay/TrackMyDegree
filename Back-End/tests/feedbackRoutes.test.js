const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const feedbackRoutes = require('../routes/feedbackRoutes').default;
const { Feedback } = require('../models/feedback');
const { feedbackController } = require('../controllers/feedbackController');

describe('Feedback Routes', () => {
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
        message: 'This is a test feedback message',
        user_id: 'user123',
      };

      const response = await request(app)
        .post('/feedback')
        .send(feedbackData)
        .expect(201);

      expect(response.body.message).toBe('Feedback submitted successfully');
      expect(response.body.feedback).toMatchObject({
        message: 'This is a test feedback message',
        user_id: 'user123',
      });
      expect(response.body.feedback._id).toBeDefined();
      expect(response.body.feedback.submitted_at).toBeDefined();
    });

    it('should submit feedback without user_id', async () => {
      const feedbackData = {
        message: 'Anonymous feedback message',
      };

      const response = await request(app)
        .post('/feedback')
        .send(feedbackData)
        .expect(201);

      expect(response.body.message).toBe('Feedback submitted successfully');
      expect(response.body.feedback).toMatchObject({
        message: 'Anonymous feedback message',
        user_id: null,
      });
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/feedback')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Missing required field: message');
    });

    it('should handle server errors', async () => {
      const originalSubmitFeedback = feedbackController.submitFeedback;
      feedbackController.submitFeedback = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/feedback')
        .send({ message: 'Test message' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      feedbackController.submitFeedback = originalSubmitFeedback;
    });
  });

  describe('GET /feedback', () => {
    beforeEach(async () => {
      await Feedback.create([
        {
          message: 'Feedback 1',
          user_id: 'user123',
          submitted_at: new Date('2023-01-01'),
        },
        {
          message: 'Feedback 2',
          user_id: 'user123',
          submitted_at: new Date('2023-01-02'),
        },
        {
          message: 'Feedback 3',
          user_id: 'user456',
          submitted_at: new Date('2023-01-03'),
        },
        {
          message: 'Anonymous feedback',
          user_id: null,
          submitted_at: new Date('2023-01-04'),
        },
      ]);
    });

    it('should get all feedback', async () => {
      const response = await request(app).get('/feedback').expect(200);

      expect(response.body.message).toBe('Feedback retrieved successfully');
      expect(response.body.feedback).toHaveLength(4);
      expect(response.body.feedback[0]).toHaveProperty('_id');
      expect(response.body.feedback[0]).toHaveProperty('message');
      expect(response.body.feedback[0]).toHaveProperty('user_id');
      expect(response.body.feedback[0]).toHaveProperty('submitted_at');
    });

    it('should filter feedback by user_id', async () => {
      const response = await request(app)
        .get('/feedback?user_id=user123')
        .expect(200);

      expect(response.body.feedback).toHaveLength(2);
      expect(response.body.feedback.every((f) => f.user_id === 'user123')).toBe(
        true,
      );
    });

    it('should paginate feedback', async () => {
      const response = await request(app)
        .get('/feedback?page=1&limit=2')
        .expect(200);

      expect(response.body.feedback).toHaveLength(2);
    });

    it('should sort feedback by submitted_at descending by default', async () => {
      const response = await request(app).get('/feedback').expect(200);

      expect(response.body.feedback[0].message).toBe('Anonymous feedback');
      expect(response.body.feedback[1].message).toBe('Feedback 3');
      expect(response.body.feedback[2].message).toBe('Feedback 2');
      expect(response.body.feedback[3].message).toBe('Feedback 1');
    });

    it('should sort feedback by submitted_at ascending', async () => {
      const response = await request(app).get('/feedback?sort=asc').expect(200);

      expect(response.body.feedback[0].message).toBe('Feedback 1');
      expect(response.body.feedback[1].message).toBe('Feedback 2');
      expect(response.body.feedback[2].message).toBe('Feedback 3');
      expect(response.body.feedback[3].message).toBe('Anonymous feedback');
    });

    it('should handle server errors', async () => {
      const originalGetAllFeedback = feedbackController.getAllFeedback;
      feedbackController.getAllFeedback = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/feedback').expect(500);

      expect(response.body.error).toBe('Internal server error');

      feedbackController.getAllFeedback = originalGetAllFeedback;
    });
  });

  describe('GET /feedback/:id', () => {
    let testFeedback;

    beforeEach(async () => {
      testFeedback = await Feedback.create({
        message: 'Test feedback message',
        user_id: 'user123',
        submitted_at: new Date(),
      });
    });

    it('should get feedback by ID', async () => {
      const response = await request(app)
        .get(`/feedback/${testFeedback._id}`)
        .expect(200);

      expect(response.body.message).toBe('Feedback retrieved successfully');
      expect(response.body.feedback).toMatchObject({
        _id: testFeedback._id.toString(),
        message: 'Test feedback message',
        user_id: 'user123',
      });
      expect(response.body.feedback.submitted_at).toBeDefined();
    });

    it('should return 404 for non-existent feedback', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/feedback/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Feedback not found');
    });

    it('should handle server errors', async () => {
      const originalGetFeedbackById = feedbackController.getFeedbackById;
      feedbackController.getFeedbackById = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/feedback/${testFeedback._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      feedbackController.getFeedbackById = originalGetFeedbackById;
    });
  });

  describe('DELETE /feedback/:id', () => {
    let testFeedback;

    beforeEach(async () => {
      testFeedback = await Feedback.create({
        message: 'Test feedback to delete',
        user_id: 'user123',
        submitted_at: new Date(),
      });
    });

    it('should delete feedback', async () => {
      const response = await request(app)
        .delete(`/feedback/${testFeedback._id}`)
        .expect(200);

      expect(response.body.message).toBe('Feedback deleted successfully');

      const deletedFeedback = await Feedback.findById(testFeedback._id);
      expect(deletedFeedback).toBeNull();
    });

    it('should return 404 for non-existent feedback', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/feedback/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Feedback not found');
    });

    it('should handle server errors', async () => {
      const originalDeleteFeedback = feedbackController.deleteFeedback;
      feedbackController.deleteFeedback = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/feedback/${testFeedback._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      feedbackController.deleteFeedback = originalDeleteFeedback;
    });
  });

  describe('DELETE /feedback/user/:userId', () => {
    beforeEach(async () => {
      await Feedback.create([
        {
          message: 'User 1 Feedback 1',
          user_id: 'user123',
          submitted_at: new Date(),
        },
        {
          message: 'User 1 Feedback 2',
          user_id: 'user123',
          submitted_at: new Date(),
        },
        {
          message: 'User 2 Feedback',
          user_id: 'user456',
          submitted_at: new Date(),
        },
      ]);
    });

    it('should delete all feedback for user', async () => {
      const response = await request(app)
        .delete('/feedback/user/user123')
        .expect(200);

      expect(response.body.message).toBe(
        'All user feedback deleted successfully',
      );
      expect(response.body.deletedCount).toBe(2);

      const userFeedback = await Feedback.find({ user_id: 'user123' });
      expect(userFeedback).toHaveLength(0);

      const otherUserFeedback = await Feedback.find({ user_id: 'user456' });
      expect(otherUserFeedback).toHaveLength(1);
    });

    it('should return 0 for user with no feedback', async () => {
      const response = await request(app)
        .delete('/feedback/user/nonexistent')
        .expect(200);

      expect(response.body.deletedCount).toBe(0);
    });

    it('should handle server errors', async () => {
      const originalDeleteUserFeedback = feedbackController.deleteUserFeedback;
      feedbackController.deleteUserFeedback = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/feedback/user/user123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      feedbackController.deleteUserFeedback = originalDeleteUserFeedback;
    });
  });
});


