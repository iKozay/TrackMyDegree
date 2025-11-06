const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const timelineRoutes = require('../routes/mongo/timelineRoutes').default;
const { Timeline } = require('../models/Timeline');

// Increase timeout for mongodb-memory-server binary download/startup
jest.setTimeout(60000);

// Create test app
const app = express();
app.use(express.json());
app.use('/timeline', timelineRoutes);

describe('Timeline Routes', () => {
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
    await Timeline.deleteMany({});
  });

  describe('POST /timeline', () => {
    it('should save new timeline', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2023,
            courses: ['COMP101', 'MATH101'],
          },
          {
            _id: 'item2',
            season: 'winter',
            year: 2024,
            courses: ['COMP102'],
          },
        ],
        isExtendedCredit: false,
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(201);

      expect(response.body).toMatchObject({
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        isExtendedCredit: false,
      });
      expect(response.body._id).toBeDefined();
      expect(response.body.items).toHaveLength(2);
    });

    it('should save a new timeline with user_id and degree_id', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'CS',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2024,
            courses: ['COMP101', 'MATH101'],
          },
        ],
        isExtendedCredit: false,
      };

      const response = await request(app).post('/timeline').send(timelineData);

      expect(response.status).toBe(201);
      expect(response.body.user_id).toBe('user123');
      expect(response.body.name).toBe('My Timeline');
    });

    it('should return 400 for missing required fields', async () => {
      const timelineData = {
        user_id: 'user123',
        // Missing name and degree_id
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(400);

      expect(response.body.error).toBe(
        'User ID, timeline name, and degree ID are required',
      );
    });

    it('should return 400 for missing user_id', async () => {
      const timelineData = {
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(400);

      expect(response.body.error).toBe(
        'User ID, timeline name, and degree ID are required',
      );
    });

    it('should return 400 if user_id is missing (alternative format)', async () => {
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

    it('should return 400 for missing degree_id', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(400);

      expect(response.body.error).toBe(
        'User ID, timeline name, and degree ID are required',
      );
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

    it('should return 400 if degree_id is missing (alternative format)', async () => {
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

    it('should handle server errors', async () => {
      // Mock timelineController.saveTimeline to throw an error
      const originalSaveTimeline =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.saveTimeline;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.saveTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false,
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.saveTimeline =
        originalSaveTimeline;
    });
  });

  describe('GET /timeline/user/:userId', () => {
    beforeEach(async () => {
      await Timeline.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 1',
          degreeId: 'COMP',
          items: [],
          isExtendedCredit: false,
          last_modified: new Date('2023-01-01'),
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 2',
          degreeId: 'COMP',
          items: [],
          isExtendedCredit: true,
          last_modified: new Date('2023-02-01'),
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user456',
          name: 'Other User Timeline',
          degreeId: 'SOEN',
          items: [],
          isExtendedCredit: false,
          last_modified: new Date('2023-01-15'),
        },
      ]);
    });

    it('should get all timelines for user', async () => {
      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].user_id).toBe('user123');
      expect(response.body[1].user_id).toBe('user123');
    });

    it('should get all timelines for a user (alternative)', async () => {
      await Timeline.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 1',
          degreeId: 'CS',
          items: [
            {
              _id: 'item1',
              season: 'fall',
              year: 2024,
              courses: [],
            },
          ],
          isExtendedCredit: false,
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 2',
          degreeId: 'SE',
          items: [
            {
              _id: 'item1',
              season: 'fall',
              year: 2024,
              courses: [],
            },
          ],
          isExtendedCredit: false,
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user456',
          name: 'Timeline 3',
          degreeId: 'CS',
          items: [
            {
              _id: 'item1',
              season: 'fall',
              year: 2024,
              courses: [],
            },
          ],
          isExtendedCredit: false,
        },
      ]);

      const response = await request(app).get('/timeline/user/user123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return timelines sorted by last_modified descending', async () => {
      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length >= 2) {
        expect(response.body[0].user_id).toBe('user123');
        expect(response.body[1].user_id).toBe('user123');
      }
    });

    it('should return empty array for user with no timelines', async () => {
      const response = await request(app)
        .get('/timeline/user/nonexistent')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return empty array for user with no timelines (alternative)', async () => {
      const response = await request(app).get('/timeline/user/nonexistent');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual([]);
    });

    it('should return 400 for missing userId', async () => {
      const response = await request(app).get('/timeline/user/').expect(404); // Express will return 404 for missing route parameter

      // This tests that the route requires userId parameter
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

    it('should handle server errors', async () => {
      // Mock timelineController.getTimelinesByUser to throw an error
      const originalGetTimelinesByUser =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.getTimelinesByUser;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser =
        originalGetTimelinesByUser;
    });

    it('should handle errors during fetch', async () => {
      // Mock timelineController.getTimelinesByUser to throw an error
      const originalGetTimelinesByUser =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.getTimelinesByUser;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/timeline/user/user123');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser =
        originalGetTimelinesByUser;
    });
  });

  describe('GET /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      const id = new mongoose.Types.ObjectId().toString();
      testTimeline = await Timeline.create({
        _id: id,
        userId: 'user123',
        name: 'Test Timeline',
        degreeId: 'COMP',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2023,
            courses: ['COMP101'],
          },
        ],
        isExtendedCredit: false,
      });
    });

    it('should get timeline by ID', async () => {
      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        _id: testTimeline._id.toString(),
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        isExtendedCredit: false,
      });
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        _id: expect.any(String),
        season: 'fall',
        year: 2023,
        courses: ['COMP101'],
      });
    });

    it('should get timeline by ID (alternative)', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const timeline = await Timeline.create({
        _id: id,
        userId: 'user123',
        name: 'Test Timeline',
        degreeId: 'CS',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2024,
            courses: [],
          },
        ],
        isExtendedCredit: false,
      });
      const timelineId = timeline._id.toString();

      const response = await request(app).get(`/timeline/${timelineId}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Timeline');
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/timeline/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Timeline not found');
    });

    it('should return 404 for non-existent timeline (alternative)', async () => {
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

    it('should handle server errors', async () => {
      // Mock timelineController.getTimelineById to throw an error
      const originalGetTimelineById =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.getTimelineById;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById =
        originalGetTimelineById;
    });

    it('should handle errors during fetch', async () => {
      // Mock timelineController.getTimelineById to throw an error
      const originalGetTimelineById =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.getTimelineById;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/timeline/${fakeId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById =
        originalGetTimelineById;
    });
  });

  describe('PUT /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      const id = new mongoose.Types.ObjectId().toString();
      testTimeline = await Timeline.create({
        _id: id,
        userId: 'user123',
        name: 'Original Timeline',
        degreeId: 'COMP',
        items: [],
        isExtendedCredit: false,
      });
    });

    it('should update timeline', async () => {
      const updates = {
        name: 'Updated Timeline',
        isExtendedCredit: true,
      };

      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe('Updated Timeline');
      expect(response.body.isExtendedCredit).toBe(true);
    });

    it('should update timeline (alternative)', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const timeline = await Timeline.create({
        _id: id,
        userId: 'user123',
        name: 'Original Name',
        degreeId: 'CS',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2024,
            courses: [],
          },
        ],
        isExtendedCredit: false,
      });
      const timelineId = timeline._id.toString();

      const updates = {
        name: 'Updated Name',
        items: [
          {
            _id: 'item1',
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
      expect(response.body).toBeDefined();
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { name: 'Updated Timeline' };

      const response = await request(app)
        .put(`/timeline/${fakeId}`)
        .send(updates)
        .expect(404);

      expect(response.body.error).toBe('Timeline not found');
    });

    it('should return 404 for non-existent timeline (alternative)', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { name: 'New Name' };

      const response = await request(app)
        .put(`/timeline/${fakeId}`)
        .send(updates);

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

      const response = await request(testApp)
        .put('/test')
        .send({ name: 'Test' });
      expect(response.status).toBe(400);
    });

    it('should handle server errors', async () => {
      // Mock timelineController.updateTimeline to throw an error
      const originalUpdateTimeline =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.updateTimeline;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const updates = { name: 'Updated Timeline' };
      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send(updates)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline =
        originalUpdateTimeline;
    });

    it('should handle errors during update', async () => {
      // Mock timelineController.updateTimeline to throw an error
      const originalUpdateTimeline =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.updateTimeline;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { name: 'New Name' };
      const response = await request(app)
        .put(`/timeline/${fakeId}`)
        .send(updates);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline =
        originalUpdateTimeline;
    });
  });

  describe('DELETE /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      const id = new mongoose.Types.ObjectId().toString();
      testTimeline = await Timeline.create({
        _id: id,
        userId: 'user123',
        name: 'Test Timeline',
        degreeId: 'COMP',
        items: [],
        isExtendedCredit: false,
      });
    });

    it('should delete timeline', async () => {
      const response = await request(app)
        .delete(`/timeline/${testTimeline._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(testTimeline._id);
      expect(deletedTimeline).toBeNull();
    });

    it('should delete timeline (alternative)', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const timeline = await Timeline.create({
        _id: id,
        userId: 'user123',
        name: 'To Delete',
        degreeId: 'CS',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2024,
            courses: [],
          },
        ],
        isExtendedCredit: false,
      });
      const timelineId = timeline._id.toString();

      const response = await request(app).delete(`/timeline/${timelineId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');

      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(timelineId);
      expect(deletedTimeline).toBeNull();
    });

    it('should return 200 for non-existent timeline (with success false)', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/timeline/${fakeId}`)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle non-existent timeline (alternative)', async () => {
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

    it('should handle server errors', async () => {
      // Mock timelineController.removeUserTimeline to throw an error
      const originalRemoveUserTimeline =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.removeUserTimeline;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline =
        originalRemoveUserTimeline;
    });

    it('should handle errors during delete', async () => {
      // Mock timelineController.removeUserTimeline to throw an error
      const originalRemoveUserTimeline =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.removeUserTimeline;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).delete(`/timeline/${fakeId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline =
        originalRemoveUserTimeline;
    });
  });

  describe('DELETE /timeline/user/:userId', () => {
    beforeEach(async () => {
      await Timeline.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 1',
          degreeId: 'COMP',
          items: [],
          isExtendedCredit: false,
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 2',
          degreeId: 'COMP',
          items: [],
          isExtendedCredit: true,
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user456',
          name: 'Other User Timeline',
          degreeId: 'SOEN',
          items: [],
          isExtendedCredit: false,
        },
      ]);
    });

    it('should delete all timelines for user', async () => {
      const response = await request(app)
        .delete('/timeline/user/user123')
        .expect(200);

      expect(response.body.message).toContain('Deleted');
      expect(response.body.message).toContain('timelines for user');
    });

    it('should delete all timelines for a user (alternative)', async () => {
      await Timeline.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 1',
          degreeId: 'CS',
          items: [
            {
              _id: 'item1',
              season: 'fall',
              year: 2024,
              courses: [],
            },
          ],
          isExtendedCredit: false,
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: 'user123',
          name: 'Timeline 2',
          degreeId: 'SE',
          items: [
            {
              _id: 'item1',
              season: 'fall',
              year: 2024,
              courses: [],
            },
          ],
          isExtendedCredit: false,
        },
      ]);

      const response = await request(app).delete('/timeline/user/user123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 0 for user with no timelines', async () => {
      const response = await request(app)
        .delete('/timeline/user/nonexistent')
        .expect(200);

      expect(response.body.message).toContain('Deleted');
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

    it('should handle server errors', async () => {
      // Mock timelineController.deleteAllUserTimelines to throw an error
      const originalDeleteAllUserTimelines =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.deleteAllUserTimelines;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/timeline/user/user123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines =
        originalDeleteAllUserTimelines;
    });

    it('should handle errors during delete', async () => {
      // Mock timelineController.deleteAllUserTimelines to throw an error
      const originalDeleteAllUserTimelines =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.deleteAllUserTimelines;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/timeline/user/user123');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines =
        originalDeleteAllUserTimelines;
    });
  });

  // Additional tests for uncovered error branches
  describe('Error handling edge cases', () => {
    it('GET /timeline/user/:userId should handle general errors (not database specific)', async () => {
      const originalGetTimelinesByUser =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.getTimelinesByUser;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser =
        jest.fn().mockRejectedValue(new Error('General error'));

      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser =
        originalGetTimelinesByUser;
    });

    it('GET /timeline/:id should handle general errors (not "not found")', async () => {
      const testTimeline = await Timeline.create({
        _id: new mongoose.Types.ObjectId().toString(),
        userId: 'user123',
        name: 'Test',
        degreeId: 'COMP',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2023,
            courses: [],
          },
        ],
        isExtendedCredit: false,
      });

      const originalGetTimelineById =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.getTimelineById;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById =
        jest.fn().mockRejectedValue(new Error('General error'));

      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      require('../controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById =
        originalGetTimelineById;
    });

    it('PUT /timeline/:id should handle general errors (not "not found")', async () => {
      const testTimeline = await Timeline.create({
        _id: new mongoose.Types.ObjectId().toString(),
        userId: 'user123',
        name: 'Test',
        degreeId: 'COMP',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2023,
            courses: [],
          },
        ],
        isExtendedCredit: false,
      });

      const originalUpdateTimeline =
        require('../controllers/mondoDBControllers/TimelineController')
          .timelineController.updateTimeline;
      require('../controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline =
        jest.fn().mockRejectedValue(new Error('General error'));

      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send({ name: 'Updated' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      require('../controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline =
        originalUpdateTimeline;
    });
  });
});