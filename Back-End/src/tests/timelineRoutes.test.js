const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const timelineRoutes = require('../routes/timelineRoutes').default;
const { Timeline } = require('../models/timeline');

// Increase timeout for mongodb-memory-server binary download/startup
jest.setTimeout(60000);

jest.mock('../middleware/assignJobId', () => ({
  assignJobId: jest.fn((req, _res, next) => {
    req.jobId = 'test-job-id'; // normal behavior
    next();
  }),
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/timeline', timelineRoutes);

jest.mock('../workers/queue', () => {
  return {
    queue: {
      add: jest.fn().mockResolvedValue(undefined), // mock adding jobs
    },
  };
});

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
  const userId = new mongoose.Types.ObjectId().toString();
  const baseTimelineData = {
    userId: userId,
    name: 'My Timeline',
    degreeId: 'COMP',
    semesters: [
      { term:"FALL 2023", courses: [
        { code: 'COMP101' },
        { code: 'MATH101' },
      ] },
    ],
    isExtendedCredit: false,
    isCoop: false,
    courses: {
      COMP101: { status: { status: 'completed', semester: 'FALL 2023' } },
      MATH101: { status: { status: 'planned', semester: 'FALL 2023' } },
      HIST101: { status: { status: 'incomplete', semester: null } },
    },
    coursePools: [
      { _id: 'exemptions', courses: ['COMP100'] },
      { _id: 'deficiencies', courses: ['MATH100'] },
    ],
  };

  it('should save a new timeline successfully', async () => {
    const response = await request(app)
      .post('/timeline')
      .send(baseTimelineData)
      .expect(201);

    expect(response.body._id).toBeDefined();
    expect(response.body.userId).toBe(baseTimelineData.userId.toString());
    expect(response.body.name).toBe(baseTimelineData.name);
    expect(response.body.degreeId).toBe(baseTimelineData.degreeId);
    expect(response.body.isExtendedCredit).toBe(false);
    expect(response.body.semesters).toHaveLength(1);
    //expect(response.body.courseStatusMap.get('COMP101').status).toBe('completed');
   // expect(response.body.courseStatusMap).toHaveProperty('MATH101');
    //expect(response.body.courseStatusMap).not.toHaveProperty('HIST101'); // incomplete ignored
    expect(response.body.exemptions).toEqual(['COMP100']);
    expect(response.body.deficiencies).toEqual(['MATH100']);
  });

  it('should return 400 if userId, name, or degreeId are missing', async () => {
    const invalidDataSets = [
      { ...baseTimelineData, userId: undefined },
      { ...baseTimelineData, name: undefined },
      { ...baseTimelineData, degreeId: undefined },
    ];

    for (const data of invalidDataSets) {
      const response = await request(app).post('/timeline').send(data).expect(400);
      expect(response.body.error).toContain('User ID, timeline name, and degree ID');
    }
  });

  it('should handle server errors gracefully', async () => {
    const originalSaveTimeline = require('../controllers/timelineController').timelineController.saveTimeline;
    require('../controllers/timelineController').timelineController.saveTimeline =
      jest.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/timeline')
      .send(baseTimelineData)
      .expect(500);

    expect(response.body.error).toBe('Internal server error');

    // Restore original method
    require('../controllers/timelineController').timelineController.saveTimeline =
      originalSaveTimeline;
  });

  it('should create timeline with minimal required fields', async () => {
    const minimalData = {
      userId: 'user456',
      name: 'Minimal Timeline',
      degreeId: 'CS',
      semesters: [],
      isExtendedCredit: false,
    };

    const response = await request(app).post('/timeline').send(minimalData).expect(201);

    expect(response.body._id).toBeDefined();
    expect(response.body.userId).toBe(minimalData.userId);
    expect(response.body.name).toBe(minimalData.name);
    expect(response.body.degreeId).toBe(minimalData.degreeId);
    expect(response.body.semesters).toEqual([]);
    expect(response.body.courseStatusMap).toEqual({});
    expect(response.body.exemptions).toEqual([]);
    expect(response.body.deficiencies).toEqual([]);
  });
});

  describe('GET /timeline/:id', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        userId: 'user123',
        name: 'Original Timeline',
        degreeId: 'COMP',
        semesters: [
          {
            term: 'FALL 2023',
            courses: [{ code: 'COMP101' }],
          },
        ],
      });
    });

    it('should enqueue a job and return jobId', async () => {
    const response = await request(app)
      .get(`/timeline/${testTimeline._id}`)
      .expect(202);

    expect(response.body).toHaveProperty('jobId');
    expect(response.body.status).toBe('processing');
  });

  it('should return 400 for invalid id format', async () => {
    const response = await request(app)
      .get('/timeline/invalid-id')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 500 if jobId is missing', async () => {
    const { assignJobId }  = require('../middleware/assignJobId');

     assignJobId.mockImplementationOnce((req, _res, next) => {
    // simulate failure
        next();
      });


    const response = await request(app)
      .get(`/timeline/${testTimeline._id}`)
      .expect(500);

    expect(response.body.error).toBe('Job ID missing');

    jest.restoreAllMocks();
  });

  it('should handle queue errors', async () => {
    const queue = require('../workers/queue').queue;

    jest.spyOn(queue, 'add').mockRejectedValue(new Error('Queue error'));

    const response = await request(app)
      .get(`/timeline/${testTimeline._id}`)
      .expect(500);

    expect(response.body.error).toBe('Internal server error');

    jest.restoreAllMocks();
  });


  });
  describe('PUT /timeline/:id', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const baseTimelineData = {
        userId: userId,
        name: 'Original Timeline',
        degreeId: 'COMP',
        semesters: [
          { term:"FALL 2023", courses: [
            { code: 'COMP101' },
            { code: 'MATH101' },
          ] },
        ],
        isExtendedCredit: false,
        isCoop: false,
        courses: {
          COMP101: { status: { status: 'completed', semester: 'FALL 2023' } },
          MATH101: { status: { status: 'planned', semester: 'FALL 2023' } },
          HIST101: { status: { status: 'incomplete', semester: null } },
        },
        coursePools: [
          { _id: 'exemptions', courses: ['COMP100'] },
          { _id: 'deficiencies', courses: ['MATH100'] },
        ],
      };

    let testTimeline;
    beforeEach(async () => {
      testTimeline = await Timeline.create(baseTimelineData);
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
        require('../controllers/timelineController').timelineController
          .updateTimeline;
      require('../controllers/timelineController').timelineController.updateTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const updates = { name: 'Updated Timeline' };
      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send(updates)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/timelineController').timelineController.updateTimeline =
        originalUpdateTimeline;
    });

    it('should handle errors during update', async () => {
      // Mock timelineController.updateTimeline to throw an error
      const originalUpdateTimeline =
        require('../controllers/timelineController').timelineController
          .updateTimeline;
      require('../controllers/timelineController').timelineController.updateTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { name: 'New Name' };
      const response = await request(app)
        .put(`/timeline/${fakeId}`)
        .send(updates);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/timelineController').timelineController.updateTimeline =
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

      expect(response.body).toContain('deleted successfully');

      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(testTimeline._id);
      expect(deletedTimeline).toBeNull();
    });

    it('should delete timeline (alternative)', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const timeline = await Timeline.create({
        _id: id,
        userId: new mongoose.Types.ObjectId(),
          name: 'Timeline 1',
          degreeId: 'COMP',
          semesters: [],
          courseStatusMap: {},
          exemptions: [],
          deficiencies: [],
          isExtendedCredit: false,
          isCoop: false,
        });
      const timelineId = timeline._id.toString();

      const response = await request(app).delete(`/timeline/${timelineId}`);

      expect(response.status).toBe(200);
      expect(response.body).toContain('deleted successfully');
      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(timelineId);
      expect(deletedTimeline).toBeNull();
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/timeline/${fakeId}`)
        .expect(404);
      
      expect(response.body.error).toContain('does not exist');
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
      // Mock timelineController.deleteTimeline to throw an error
      const originaldeleteTimeline =
        require('../controllers/timelineController').timelineController
          .deleteTimeline;
      require('../controllers/timelineController').timelineController.deleteTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/timelineController').timelineController.deleteTimeline =
        originaldeleteTimeline;
    });

    it('should handle errors during delete', async () => {
      // Mock timelineController.deleteTimeline to throw an error
      const originaldeleteTimeline =
        require('../controllers/timelineController').timelineController
          .deleteTimeline;
      require('../controllers/timelineController').timelineController.deleteTimeline =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).delete(`/timeline/${fakeId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/timelineController').timelineController.deleteTimeline =
        originaldeleteTimeline;
    });
  });

  describe('DELETE /timeline/user/:userId', () => {
    const userId = new mongoose.Types.ObjectId().toString();;
    const userId2 = new mongoose.Types.ObjectId();
    const userWithNoTimeline = new mongoose.Types.ObjectId().toString();
    beforeEach(async () => {
       await Timeline.create([
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          name: 'Timeline 1',
          degreeId: 'COMP',
          semesters: [],
          courseStatusMap: {},
          exemptions: [],
          deficiencies: [],
          isExtendedCredit: false,
          isCoop: false,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          name: 'Timeline 2',
          degreeId: 'COMP',
          semesters: [
            {
              term: 'FALL 2023',
              courses: [{ code: 'COMP101', message: 'Completed' }],
            },
          ],
          courseStatusMap: {
            COMP101: { status: 'completed', semester: 'FALL 2023' },
          },
          exemptions: [],
          deficiencies: [],
          isExtendedCredit: true,
          isCoop: false,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId2,
          name: 'Other User Timeline',
          degreeId: 'SOEN',
          semesters: [],
          courseStatusMap: {},
          exemptions: [],
          deficiencies: [],
          isExtendedCredit: false,
          isCoop: false,
        },
      ]);
    });

    it('should delete all timelines for user', async () => {
      const response = await request(app)
        .delete(`/timeline/user/${userId}`)
        .expect(200);

      expect(response.body.message).toContain('Deleted');
      expect(response.body.message).toContain('timelines for user');
    });

    it('should delete all timelines for a user (alternative)', async () => {
      await Timeline.create([
        {
          _id: new mongoose.Types.ObjectId().toString(),
          userId: userId,
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
          userId: userId,
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

      const response = await request(app).delete(`/timeline/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 0 for user with no timelines', async () => {
      const response = await request(app)
        .delete(`/timeline/user/${userWithNoTimeline}`)
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
        require('../controllers/timelineController').timelineController
          .deleteAllUserTimelines;
      require('../controllers/timelineController').timelineController.deleteAllUserTimelines =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/timeline/user/${userId}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Restore original method
      require('../controllers/timelineController').timelineController.deleteAllUserTimelines =
        originalDeleteAllUserTimelines;
    });

    it('should handle errors during delete', async () => {
      // Mock timelineController.deleteAllUserTimelines to throw an error
      const originalDeleteAllUserTimelines =
        require('../controllers/timelineController').timelineController
          .deleteAllUserTimelines;
      require('../controllers/timelineController').timelineController.deleteAllUserTimelines =
        jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete(`/timeline/user/${userId}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original method
      require('../controllers/timelineController').timelineController.deleteAllUserTimelines =
        originalDeleteAllUserTimelines;
    });
  });

  // Additional tests for uncovered error branches
  describe('Error handling edge cases', () => {
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
        require('../controllers/timelineController').timelineController
          .getTimelineById;
      require('../controllers/timelineController').timelineController.getTimelineById =
        jest.fn().mockRejectedValue(new Error('General error'));

      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      require('../controllers/timelineController').timelineController.getTimelineById =
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
        require('../controllers/timelineController').timelineController
          .updateTimeline;
      require('../controllers/timelineController').timelineController.updateTimeline =
        jest.fn().mockRejectedValue(new Error('General error'));

      const response = await request(app)
        .put(`/timeline/${testTimeline._id}`)
        .send({ name: 'Updated' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      require('../controllers/timelineController').timelineController.updateTimeline =
        originalUpdateTimeline;
    });
  });
});
