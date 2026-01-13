const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { TimelineController } = require('../controllers/timelineController');
const { Timeline } = require('../models/timeline');

describe('TimelineController', () => {
  let mongoServer;
  let timelineController;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    timelineController = new TimelineController();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Timeline.deleteMany({});
  });

  describe('Constructor', () => {
    it('initializes with Timeline model', () => {
      expect(timelineController.model).toBe(Timeline);
      expect(timelineController.modelName).toBe('Timeline');
    });
  });

  describe('saveTimeline', () => {
    const baseTimeline = {
      userId: 'user123',
      name: 'My Timeline',
      degreeId: 'COMP',
      semesters: [
        {
          term: 'FALL 2023',
          courses: [{ code: 'COMP248' }],
        },
      ],
      courses: {
        COMP248: {
          status: { status: 'completed', semester: 'FALL 2023' },
        },
      },
      coursePools: [
        { _id: 'exemptions', courses: [] },
        { _id: 'deficiencies', courses: [] },
      ],
      isExtendedCredit: false,
      isCoop: false,
    };

    it('creates a new timeline successfully', async () => {
      const result = await timelineController.saveTimeline(baseTimeline);
      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.degreeId).toBe('COMP');
      expect(result.courseStatusMap.get('COMP248').status).toBe('completed');
    });

    it('updates an existing timeline', async () => {
      const created = await timelineController.saveTimeline(baseTimeline);

      const updated = await timelineController.saveTimeline({
        ...baseTimeline,
        _id: created._id.toString(),
        courses: {
          COMP248: {
            status: { status: 'planned', semester: 'WINTER 2024' },
          },
        },
      });

      expect(updated.courseStatusMap.COMP248.status).toBe('planned');
    });

    it('throws error when required fields are missing', async () => {
      await expect(
        timelineController.saveTimeline({
          name: 'Invalid',
          semesters: [],
          courses: {},
          coursePools: [],
        }),
      ).rejects.toThrow(
        'User ID, timeline name, and degree ID are required',
      );
    });

    it('filters out incomplete courses', async () => {
      const result = await timelineController.saveTimeline({
        ...baseTimeline,
        courses: {
          COMP248: {
            status: { status: 'incomplete', semester: null },
          },
        },
      });

      expect(result.courseStatusMap.size).toEqual(0);
    });

    it('throws when DB create fails', async () => {
      const originalCreate = timelineController.create;
      timelineController.create = jest.fn().mockResolvedValue({ success: false });

      await expect(
        timelineController.saveTimeline(baseTimeline),
      ).rejects.toThrow('Failed to save timeline');

      timelineController.create = originalCreate;
    });
  });

  describe('deleteTimeline', () => {
    let timelineId;

    beforeEach(async () => {
      const timeline = await Timeline.create({
        userId: 'user123',
        name: 'Delete Me',
        degreeId: 'COMP',
      });
      timelineId = timeline._id.toString();
    });

    it('deletes a timeline successfully', async () => {
      const result = await timelineController.deleteTimeline(timelineId);

      expect(result).toContain('deleted successfully');

      const found = await Timeline.findById(timelineId);
      expect(found).toBeNull();
    });

    it('returns not found when timeline does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(
        timelineController.deleteTimeline(fakeId)
      ).rejects.toThrow('Timeline with this id does not exist');
    });


   it('handles deleteById throwing error', async () => {
      const originalDelete = timelineController.deleteById;

      timelineController.deleteById = jest
        .fn()
        .mockRejectedValue(new Error('DB error'));

      await expect(
        timelineController.deleteTimeline(timelineId)
      ).rejects.toThrow('DB error');

      timelineController.deleteById = originalDelete;
    });

  });

  describe('deleteAllUserTimelines', () => {
    beforeEach(async () => {
      await Timeline.create([
        { userId: 'user123', name: 'T1', degreeId: 'COMP' },
        { userId: 'user123', name: 'T2', degreeId: 'COMP' },
        { userId: 'user456', name: 'Other', degreeId: 'SOEN' },
      ]);
    });

    it('deletes all timelines for a user', async () => {
      const count =
        await timelineController.deleteAllUserTimelines('user123');

      expect(count).toBe(2);
      expect(await Timeline.find({ userId: 'user123' })).toHaveLength(0);
      expect(await Timeline.find({ userId: 'user456' })).toHaveLength(1);
    });

    it('returns 0 when user has no timelines', async () => {
      const count =
        await timelineController.deleteAllUserTimelines('missing');

      expect(count).toBe(0);
    });

    it('throws when deleteMany fails', async () => {
      const originalDeleteMany = timelineController.deleteMany;
      timelineController.deleteMany = jest
        .fn()
        .mockResolvedValue({ success: false });

      await expect(
        timelineController.deleteAllUserTimelines('user123'),
      ).rejects.toThrow('Failed to delete timelines');

      timelineController.deleteMany = originalDeleteMany;
    });
  });
});
