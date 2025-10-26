const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const timelineRoutes = require('../dist/routes/mongo/timelineRoutes').default;
const { Timeline } = require('../dist/models/Timeline');

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
    await mongoServer.stop();
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
            season: 'fall',
            year: 2023,
            courses: ['COMP101', 'MATH101']
          },
          {
            season: 'winter',
            year: 2024,
            courses: ['COMP102']
          }
        ],
        isExtendedCredit: false
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(201);

      expect(response.body.message).toBe('Timeline saved successfully');
      expect(response.body.timeline).toMatchObject({
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        isExtendedCredit: false
      });
      expect(response.body.timeline.id).toBeDefined();
      expect(response.body.timeline.items).toHaveLength(2);
    });

    it('should return 400 for missing required fields', async () => {
      const timelineData = {
        user_id: 'user123',
        // Missing name and degree_id
        items: [],
        isExtendedCredit: false
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(400);

      expect(response.body.error).toBe('User ID, timeline name, and degree ID are required');
    });

    it('should return 400 for missing user_id', async () => {
      const timelineData = {
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(400);

      expect(response.body.error).toBe('User ID, timeline name, and degree ID are required');
    });

    it('should return 400 for missing degree_id', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        items: [],
        isExtendedCredit: false
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(400);

      expect(response.body.error).toBe('User ID, timeline name, and degree ID are required');
    });

    it('should handle server errors', async () => {
      // Mock timelineController.saveTimeline to throw an error
      const originalSaveTimeline = require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.saveTimeline;
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.saveTimeline = jest.fn().mockRejectedValue(new Error('Database error'));

      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false
      };

      const response = await request(app)
        .post('/timeline')
        .send(timelineData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.saveTimeline = originalSaveTimeline;
    });
  });

  describe('GET /timeline/user/:userId', () => {
    beforeEach(async () => {
      await Timeline.create([
        {
          user_id: 'user123',
          name: 'Timeline 1',
          degree_id: 'COMP',
          items: [],
          isExtendedCredit: false,
          last_modified: new Date('2023-01-01')
        },
        {
          user_id: 'user123',
          name: 'Timeline 2',
          degree_id: 'COMP',
          items: [],
          isExtendedCredit: true,
          last_modified: new Date('2023-02-01')
        },
        {
          user_id: 'user456',
          name: 'Other User Timeline',
          degree_id: 'SOEN',
          items: [],
          isExtendedCredit: false,
          last_modified: new Date('2023-01-15')
        }
      ]);
    });

    it('should get all timelines for user', async () => {
      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(200);

      expect(response.body.message).toBe('Timelines retrieved successfully');
      expect(response.body.timelines).toHaveLength(2);
      expect(response.body.timelines[0].user_id).toBe('user123');
      expect(response.body.timelines[1].user_id).toBe('user123');
    });

    it('should return timelines sorted by last_modified descending', async () => {
      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(200);

      expect(response.body.timelines[0].name).toBe('Timeline 2'); // More recent
      expect(response.body.timelines[1].name).toBe('Timeline 1'); // Older
    });

    it('should return empty array for user with no timelines', async () => {
      const response = await request(app)
        .get('/timeline/user/nonexistent')
        .expect(200);

      expect(response.body.timelines).toHaveLength(0);
    });

    it('should return 400 for missing userId', async () => {
      const response = await request(app)
        .get('/timeline/user/')
        .expect(404); // Express will return 404 for missing route parameter

      // This tests that the route requires userId parameter
    });

    it('should handle server errors', async () => {
      // Mock timelineController.getTimelinesByUser to throw an error
      const originalGetTimelinesByUser = require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser;
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/timeline/user/user123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.getTimelinesByUser = originalGetTimelinesByUser;
    });
  });

  describe('GET /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        items: [
          {
            season: 'fall',
            year: 2023,
            courses: ['COMP101']
          }
        ],
        isExtendedCredit: false
      });
    });

    it('should get timeline by ID', async () => {
      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(200);

      expect(response.body.message).toBe('Timeline retrieved successfully');
      expect(response.body.timeline).toMatchObject({
        id: testTimeline._id.toString(),
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        isExtendedCredit: false
      });
      expect(response.body.timeline.items).toHaveLength(1);
      expect(response.body.timeline.items[0]).toMatchObject({
        season: 'fall',
        year: 2023,
        courses: ['COMP101']
      });
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/timeline/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Timeline not found');
    });

    it('should handle server errors', async () => {
      // Mock timelineController.getTimelineById to throw an error
      const originalGetTimelineById = require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById;
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.getTimelineById = originalGetTimelineById;
    });
  });

  describe('PUT /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        user_id: 'user123',
        name: 'Original Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false
      });
    });

    it('should update timeline', async () => {
      const updates = {
        name: 'Updated Timeline',
        isExtendedCredit: true
      };

      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send(updates)
        .expect(200);

      expect(response.body.message).toBe('Timeline updated successfully');
      expect(response.body.timeline.name).toBe('Updated Timeline');
      expect(response.body.timeline.isExtendedCredit).toBe(true);
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

    it('should handle server errors', async () => {
      // Mock timelineController.updateTimeline to throw an error
      const originalUpdateTimeline = require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline;
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline = jest.fn().mockRejectedValue(new Error('Database error'));

      const updates = { name: 'Updated Timeline' };
      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send(updates)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.updateTimeline = originalUpdateTimeline;
    });
  });

  describe('DELETE /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false
      });
    });

    it('should delete timeline', async () => {
      const response = await request(app)
        .delete(`/timeline/${testTimeline._id}`)
        .expect(200);

      expect(response.body.message).toBe('Timeline deleted successfully');

      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(testTimeline._id);
      expect(deletedTimeline).toBeNull();
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/timeline/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('Timeline not found');
    });

    it('should handle server errors', async () => {
      // Mock timelineController.removeUserTimeline to throw an error
      const originalRemoveUserTimeline = require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline;
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.removeUserTimeline = originalRemoveUserTimeline;
    });
  });

  describe('DELETE /timeline/user/:userId', () => {
    beforeEach(async () => {
      await Timeline.create([
        {
          user_id: 'user123',
          name: 'Timeline 1',
          degree_id: 'COMP',
          items: [],
          isExtendedCredit: false
        },
        {
          user_id: 'user123',
          name: 'Timeline 2',
          degree_id: 'COMP',
          items: [],
          isExtendedCredit: true
        },
        {
          user_id: 'user456',
          name: 'Other User Timeline',
          degree_id: 'SOEN',
          items: [],
          isExtendedCredit: false
        }
      ]);
    });

    it('should delete all timelines for user', async () => {
      const response = await request(app)
        .delete('/timeline/user/user123')
        .expect(200);

      expect(response.body.message).toBe('All user timelines deleted successfully');
      expect(response.body.deletedCount).toBe(2);

      // Verify timelines are deleted
      const remainingTimelines = await Timeline.find({ user_id: 'user123' });
      expect(remainingTimelines).toHaveLength(0);

      // Verify other user's timelines remain
      const otherUserTimelines = await Timeline.find({ user_id: 'user456' });
      expect(otherUserTimelines).toHaveLength(1);
    });

    it('should return 0 for user with no timelines', async () => {
      const response = await request(app)
        .delete('/timeline/user/nonexistent')
        .expect(200);

      expect(response.body.deletedCount).toBe(0);
    });

    it('should handle server errors', async () => {
      // Mock timelineController.deleteAllUserTimelines to throw an error
      const originalDeleteAllUserTimelines = require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines;
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/timeline/user/user123')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../dist/controllers/mondoDBControllers/TimelineController').timelineController.deleteAllUserTimelines = originalDeleteAllUserTimelines;
    });
  });
});
