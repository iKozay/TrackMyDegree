const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const { Timeline } = require('../models/timeline');
const {timelineController} = require('../controllers/timelineController');
const { errorHandler } = require('../middleware/errorHandler');

jest.mock('../middleware/assignJobId', () => ({
  assignJobId: jest.fn((req, _res, next) => {
    req.jobId = 'test-job-id';
    next();
  }),
}));

jest.mock('../workers/queue', () => ({
  queue: {
    add: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../lib/cache', () => ({
  getJobResult: jest.fn(),
  cacheJobResult: jest.fn().mockResolvedValue(undefined),
}));
const cache = require('../lib/cache');
const { getJobResult } = cache;

const { queue } = require('../workers/queue');

const timelineRoutes = require('../routes/timelineRoutes').default;
// Create test app
const app = express();
app.use(express.json());
app.use('/timeline', timelineRoutes);
app.use(errorHandler);

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
  const timelineName = 'My Timeline';
  const jobId = 'test-job-id';
  const baseTimelineData = {
    degree: { _id: 'COMP' },
    semesters: [
      {
        term: 'FALL 2023',
        courses: [
          { code: 'COMP101' },
          { code: 'MATH101' },
        ],
      },
    ],
    isExtendedCredit: false,
    isCoop: false,
    courses: {
      COMP101: { status: { status: 'completed', semester: 'FALL 2023' } },
      MATH101: { status: { status: 'planned', semester: 'FALL 2023' } },
      HIST101: { status: { status: 'incomplete', semester: null } },
    },
    pools: [
      { _id: 'exemptions', courses: ['COMP100'] },
      { _id: 'deficiencies', courses: ['MATH100'] },
    ],
  };

  const cachedTimelineResult = {
    payload: { data: baseTimelineData },
  };

  it('should save a new timeline successfully', async () => {
    getJobResult.mockResolvedValue(cachedTimelineResult);

    const response = await request(app)
      .post('/timeline')
      .send({ userId, timelineName, jobId })
      .expect(201);

    expect(response.body._id).toBeDefined();
    expect(response.body.userId).toBe(userId);
  });

  it('should return 400 if userId, timelineName, or jobId are missing', async () => {
    const invalidPayloads = [
      { timelineName: 'Test', jobId: 'job' },
      { userId, jobId: 'job' },
      { userId, timelineName: 'Test' },
    ];

    for (const body of invalidPayloads) {
      const response = await request(app)
        .post('/timeline')
        .send(body)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('BadRequestError');
    }
  });

  it('should return 404 if cached result not found or expired', async () => {
    // Update router to throw GoneError (or custom error) for null cache
    getJobResult.mockResolvedValue(null);

    const response = await request(app)
      .post('/timeline')
      .send({ userId, timelineName, jobId })
      .expect(404);

    // If you have a GoneError, you can check:
    // expect(response.body.error).toBe('ResultExpiredError');
    expect(response.body.error).toBe('NotFoundError');
  });

  it('should handle server errors gracefully', async () => {
    getJobResult.mockResolvedValue(cachedTimelineResult);

    const original = timelineController.saveTimeline;
    timelineController.saveTimeline = jest
      .fn()
      .mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .post('/timeline')
      .send({ userId, timelineName, jobId })
      .expect(500);

    expect(response.body.error).toBe('InternalServerError');
    expect(response.body.message).toBe('Internal server error');

    timelineController.saveTimeline = original;
  });

  it('should create timeline with minimal required fields', async () => {
    getJobResult.mockResolvedValue({
      payload: {
        data: {
          degree: { _id: 'CS' },
          semesters: [],
          courses: {},
          pools: [],
        },
      },
    });

    const response = await request(app)
      .post('/timeline')
      .send({
        userId: 'user456',
        timelineName: 'Minimal Timeline',
        jobId: 'test-job-id',
      })
      .expect(201);

    expect(response.body._id).toBeDefined();
    expect(response.body.userId).toBe('user456');
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
      const { assignJobId } = require('../middleware/assignJobId');

      assignJobId.mockImplementationOnce((req, _res, next) => {
        // simulate failure
        next();
      });


      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(500);
      expect(response.body.error).toBe('InternalServerError');
      expect(response.body.message).toBe('Internal server error');

      jest.restoreAllMocks();
    });

    it('should handle queue errors', async () => {

      jest.spyOn(queue, 'add').mockRejectedValue(new Error('Queue error'));

      const response = await request(app)
        .get(`/timeline/${testTimeline._id}`)
        .expect(500);

      expect(response.body.message).toBe('Internal server error');

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
        {
          term: "FALL 2023", courses: [
            { code: 'COMP101' },
            { code: 'MATH101' },
          ]
        },
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
      expect(response.body.error).toBe('NotFoundError');
      expect(response.body.message).toBe('Timeline not found');
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

    it('should return 400 if id is empty or whitespace', async () => {
      const response = await request(app).put('/timeline/%20');
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

      expect(response.body.error).toBe('InternalServerError');

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

      expect(response.body).toContain('successfully deleted');

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
      expect(response.body).toContain('successfully deleted');
      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(timelineId);
      expect(deletedTimeline).toBeNull();
    });

    it('should return 404 for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/timeline/${fakeId}`)
        .expect(404);

      expect(response.body.error).toContain('NotFoundError');
      expect(response.body.message).toBe('Timeline not found');
    });

    it('should return 400 if id is empty or whitespace', async () => {
      const response = await request(app).get('/timeline/%20');
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

      expect(response.body.error).toBe('InternalServerError');

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
    const userId = new mongoose.Types.ObjectId().toString();
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

    it('should return not found for user with no timelines', async () => {
      const response = await request(app)
        .delete(`/timeline/user/${userWithNoTimeline}`)
        .expect(404);

      expect(response.body.message).toContain('Timeline not found');
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app).delete('/timeline/user/%20');
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

      expect(response.body.error).toBe('InternalServerError');

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

      expect(response.body.error).toBe('InternalServerError');

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

      expect(response.body.error).toBe('InternalServerError');

      require('../controllers/timelineController').timelineController.updateTimeline =
        originalUpdateTimeline;
    });
  });
});
