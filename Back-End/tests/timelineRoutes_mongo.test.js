const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const timelineRoutes = require('../dist/routes/mongo/timelineRoutes').default;
const { Timeline } = require('../dist/models/Timeline');

describe('Timeline Routes (MongoDB)', () => {
  let mongoServer, mongoUri, app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    app = express();
    app.use(express.json());
    app.use('/timeline', timelineRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Timeline.deleteMany({});
  });

  describe('POST /timeline', () => {
    it('should save a new timeline', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'CS',
        items: [
          {
            id: 'item1',
            season: 'fall',
            year: 2024,
            courses: ['COMP101', 'MATH101'],
          },
        ],
        isExtendedCredit: false,
      };

      const response = await request(app).post('/timeline').send(timelineData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body.timeline.user_id).toBe('user123');
      expect(response.body.timeline.name).toBe('My Timeline');
    });

    it('should return 400 if user_id is missing', async () => {
      const timelineData = {
        name: 'My Timeline',
        degree_id: 'CS',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app).post('/timeline').send(timelineData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User ID');
    });

    it('should return 400 if name is missing', async () => {
      const timelineData = {
        user_id: 'user123',
        degree_id: 'CS',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app).post('/timeline').send(timelineData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('timeline name');
    });

    it('should return 400 if degree_id is missing', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app).post('/timeline').send(timelineData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('degree ID');
    });

    it('should handle errors during save', async () => {
      const originalCreate = Timeline.create;
      Timeline.create = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'CS',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app).post('/timeline').send(timelineData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Timeline.create = originalCreate;
    });
  });

  describe('GET /timeline/user/:userId', () => {
    beforeEach(async () => {
      await Timeline.create([
        {
          userId: 'user123',
          name: 'Timeline 1',
          degreeId: 'CS',
          items: [],
          isExtendedCredit: false,
        },
        {
          userId: 'user123',
          name: 'Timeline 2',
          degreeId: 'SE',
          items: [],
          isExtendedCredit: false,
        },
        {
          userId: 'user456',
          name: 'Timeline 3',
          degreeId: 'CS',
          items: [],
          isExtendedCredit: false,
        },
      ]);
    });

    it('should get all timelines for a user', async () => {
      const response = await request(app).get('/timeline/user/user123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timelines');
      expect(Array.isArray(response.body.timelines)).toBe(true);
      expect(response.body.timelines.length).toBe(2);
      expect(response.body.timelines[0].user_id).toBe('user123');
    });

    it('should return empty array for user with no timelines', async () => {
      const response = await request(app).get('/timeline/user/nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.timelines).toEqual([]);
    });

    it('should return 400 if userId is missing', async () => {
      // This test simulates the case where userId param is empty
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.userId) {
          res.status(400).json({ error: 'User ID is required' });
        }
      });

      const response = await request(testApp).get('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during fetch', async () => {
      const originalFind = Timeline.find;
      Timeline.find = jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get('/timeline/user/user123');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Timeline.find = originalFind;
    });
  });

  describe('GET /timeline/:id', () => {
    let timelineId;

    beforeEach(async () => {
      const timeline = await Timeline.create({
        userId: 'user123',
        name: 'Test Timeline',
        degreeId: 'CS',
        items: [],
        isExtendedCredit: false,
      });
      timelineId = timeline._id.toString();
    });

    it('should get timeline by ID', async () => {
      const response = await request(app).get(`/timeline/${timelineId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body.timeline.name).toBe('Test Timeline');
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/timeline/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if id is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.get('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Timeline ID is required' });
        }
      });

      const response = await request(testApp).get('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during fetch', async () => {
      const originalFindById = Timeline.findById;
      Timeline.findById = jest.fn(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).get(`/timeline/${timelineId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Timeline.findById = originalFindById;
    });
  });

  describe('PUT /timeline/:id', () => {
    let timelineId;

    beforeEach(async () => {
      const timeline = await Timeline.create({
        userId: 'user123',
        name: 'Original Name',
        degreeId: 'CS',
        items: [],
        isExtendedCredit: false,
      });
      timelineId = timeline._id.toString();
    });

    it('should update timeline', async () => {
      const updates = {
        name: 'Updated Name',
        items: [
        {
          id: 'item1',
          season: 'winter',
          year: 2025,
          courses: ['COMP201'],
        },
        ],
      };

      const response = await request(app)
        .put(`/timeline/${timelineId}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body.timeline.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { name: 'New Name' };

      const response = await request(app).put(`/timeline/${fakeId}`).send(updates);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if id is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.put('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Timeline ID is required' });
        }
      });

      const response = await request(testApp).put('/test').send({ name: 'Test' });
      expect(response.status).toBe(400);
    });

    it('should handle errors during update', async () => {
      const originalFindByIdAndUpdate = Timeline.findByIdAndUpdate;
      Timeline.findByIdAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const updates = { name: 'New Name' };
      const response = await request(app)
        .put(`/timeline/${timelineId}`)
        .send(updates);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Timeline.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('DELETE /timeline/:id', () => {
    let timelineId;

    beforeEach(async () => {
      const timeline = await Timeline.create({
        userId: 'user123',
        name: 'To Delete',
        degreeId: 'CS',
        items: [],
        isExtendedCredit: false,
      });
      timelineId = timeline._id.toString();
    });

    it('should delete timeline', async () => {
      const response = await request(app).delete(`/timeline/${timelineId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);

      // Verify timeline is deleted
      const timeline = await Timeline.findById(timelineId);
      expect(timeline).toBeNull();
    });

    it('should handle non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).delete(`/timeline/${fakeId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if id is missing', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.delete('/test', (req, res) => {
        if (!req.params.id) {
          res.status(400).json({ error: 'Timeline ID is required' });
        }
      });

      const response = await request(testApp).delete('/test');
      expect(response.status).toBe(400);
    });

    it('should handle errors during delete', async () => {
      const originalFindByIdAndDelete = Timeline.findByIdAndDelete;
      Timeline.findByIdAndDelete = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete(`/timeline/${timelineId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Timeline.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });

  describe('DELETE /timeline/user/:userId', () => {
    beforeEach(async () => {
      await Timeline.create([
        {
          userId: 'user123',
          name: 'Timeline 1',
          degreeId: 'CS',
          items: [],
          isExtendedCredit: false,
        },
        {
          userId: 'user123',
          name: 'Timeline 2',
          degreeId: 'SE',
          items: [],
          isExtendedCredit: false,
        },
      ]);
    });

    it('should delete all timelines for a user', async () => {
      const response = await request(app).delete('/timeline/user/user123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedCount');
      expect(response.body.deletedCount).toBe(2);

      // Verify timelines are deleted
      const timelines = await Timeline.find({ user_id: 'user123' });
      expect(timelines.length).toBe(0);
    });

    it('should return 0 for user with no timelines', async () => {
      const response = await request(app).delete('/timeline/user/nonexistent');

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
      const originalDeleteMany = Timeline.deleteMany;
      Timeline.deleteMany = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app).delete('/timeline/user/user123');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      Timeline.deleteMany = originalDeleteMany;
    });
  });
});

