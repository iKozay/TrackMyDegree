const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  TimelineController,
} = require('../controllers/mondoDBControllers/TimelineController');
const { Timeline } = require('../models/Timeline');

describe('TimelineController', () => {
  let mongoServer, mongoUri, timelineController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    timelineController = new TimelineController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Timeline.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with Timeline model', () => {
      expect(timelineController.model).toBe(Timeline);
      expect(timelineController.modelName).toBe('Timeline');
    });
  });

  describe('saveTimeline', () => {
    it('should save new timeline successfully', async () => {
      const timelineData = {
        _id: new mongoose.Types.ObjectId().toString(),
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
            courses: [],
          },
        ],
        isExtendedCredit: false,
      };

      const result = await timelineController.saveTimeline(timelineData);



      expect(result).toMatchObject({
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        isExtendedCredit: false,
      });
      expect(result._id).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        season: 'fall',
        year: 2023,
        courses: ['COMP101', 'MATH101'],
      });
      expect(result.last_modified).toBeDefined();
    });

    it('should update existing timeline', async () => {
      const timelineData = {
        _id: new mongoose.Types.ObjectId().toString(),
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [
          {
            id: 'item1',
            season: 'fall',
            year: 2023,
            courses: ['COMP101'],
          },
        ],
        isExtendedCredit: false,
      };

      // Create initial timeline
      await timelineController.saveTimeline(timelineData);

      // Update timeline
      const updatedData = {
        ...timelineData,
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
      };

      const result = await timelineController.saveTimeline(updatedData);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].courses).toContain('MATH101');
    });

    it('should throw error when required fields are missing', async () => {
      const invalidTimeline = {
        _id: new mongoose.Types.ObjectId().toString(),
        user_id: 'user123',
        // Missing name and degree_id
        items: [],
        isExtendedCredit: false,
      };

      await expect(
        timelineController.saveTimeline(invalidTimeline),
      ).rejects.toThrow('User ID, timeline name, and degree ID are required');
    });

    it('should throw error when user_id is missing', async () => {
      const invalidTimeline = {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false,
      };

      await expect(
        timelineController.saveTimeline(invalidTimeline),
      ).rejects.toThrow('User ID, timeline name, and degree ID are required');
    });

    it('should handle database errors', async () => {
      // Mock upsert to return error
      const originalUpsert = timelineController.upsert;
      timelineController.upsert = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const timelineData = {
        user_id: 'user123',
        name: 'My Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false,
      };

      await expect(
        timelineController.saveTimeline(timelineData),
      ).rejects.toThrow('Failed to save timeline');

      // Restore original method
      timelineController.upsert = originalUpsert;
    });
  });

  describe('getTimelinesByUser', () => {
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

    it('should get all timelines for specific user', async () => {
      const result = await timelineController.getTimelinesByUser('user123');

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('user123');
      expect(result[1].user_id).toBe('user123');
    });

    it('should return timelines sorted by last_modified descending', async () => {
      const result = await timelineController.getTimelinesByUser('user123');

      expect(result[0].name).toBe('Timeline 2'); // More recent
      expect(result[1].name).toBe('Timeline 1'); // Older
    });

    it('should return empty array for user with no timelines', async () => {
      const result = await timelineController.getTimelinesByUser('nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock findAll to return error
      const originalFindAll = timelineController.findAll;
      timelineController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      await expect(
        timelineController.getTimelinesByUser('user123'),
      ).rejects.toThrow('Failed to fetch timelines');

      // Restore original method
      timelineController.findAll = originalFindAll;
    });
  });

  describe('getTimelineById', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        _id: new mongoose.Types.ObjectId().toString(),
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
      const result = await timelineController.getTimelineById(
        testTimeline._id.toString(),
      );

      expect(result).toMatchObject({
        _id: testTimeline._id,
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        isExtendedCredit: false,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        season: 'fall',
        year: 2023,
        courses: ['COMP101'],
      });
    });

    it('should throw error for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(timelineController.getTimelineById(fakeId)).rejects.toThrow(
        'Timeline not found',
      );
    });

    it('should handle database errors', async () => {
      // Mock findById to return error
      const originalFindById = timelineController.findById;
      timelineController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      await expect(
        timelineController.getTimelineById(testTimeline._id.toString()),
      ).rejects.toThrow('Timeline not found');

      // Restore original method
      timelineController.findById = originalFindById;
    });
  });

  describe('updateTimeline', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        _id: new mongoose.Types.ObjectId().toString(),
        userId: 'user123',
        name: 'Original Timeline',
        degreeId: 'COMP',
        items: [],
        isExtendedCredit: false,
      });
    });

    it('should update timeline successfully', async () => {
      const updates = {
        userId: 'user123',
        degreeId: 'SOEN',
        name: 'Updated Timeline',
        isExtendedCredit: true,
      };

      const result = await timelineController.updateTimeline(
        testTimeline._id.toString(),
        updates,
      );

      expect(result.name).toBe('Updated Timeline');
      expect(result.isExtendedCredit).toBe(true);
      expect(result.last_modified).toBeDefined();
    });

    it('should throw error for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updates = { name: 'Updated Timeline' };

      await expect(
        timelineController.updateTimeline(fakeId, updates),
      ).rejects.toThrow('Timeline not found');
    });

    it('should handle database errors', async () => {
      // Mock updateById to return error
      const originalUpdateById = timelineController.updateById;
      timelineController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const updates = { name: 'Updated Timeline' };
      await expect(
        timelineController.updateTimeline(testTimeline._id.toString(), updates),
      ).rejects.toThrow('Timeline not found');

      // Restore original method
      timelineController.updateById = originalUpdateById;
    });
  });

  describe('removeUserTimeline', () => {
    let testTimeline;

    beforeEach(async () => {
      testTimeline = await Timeline.create({
        _id: new mongoose.Types.ObjectId().toString(),
        userId: 'user123',
        name: 'Test Timeline',
        degreeId: 'COMP',
        items: [],
        isExtendedCredit: false,
      });
    });

    it('should remove timeline successfully', async () => {
      const result = await timelineController.removeUserTimeline(
        testTimeline._id.toString(),
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        `Timeline ${testTimeline._id} deleted successfully`,
      );

      // Verify timeline is deleted
      const deletedTimeline = await Timeline.findById(testTimeline._id);
      expect(deletedTimeline).toBeNull();
    });

    it('should return error for non-existent timeline', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await timelineController.removeUserTimeline(fakeId);

      expect(result.success).toBe(false);
      expect(result.message).toBe(`Timeline ${fakeId} not found`);
    });

    it('should handle error when deleting timeline', async () => {
      // Mock deleteById to throw an error (not just return {success: false})
      const originalDeleteById = timelineController.deleteById;
      timelineController.deleteById = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await timelineController.removeUserTimeline(
        testTimeline._id.toString(),
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error occurred while deleting timeline.');

      // Restore original method
      timelineController.deleteById = originalDeleteById;
    });

    it('should handle database errors gracefully', async () => {
      // Mock deleteById to return error
      const originalDeleteById = timelineController.deleteById;
      timelineController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const result = await timelineController.removeUserTimeline(
        testTimeline._id.toString(),
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe(`Timeline ${testTimeline._id.toString()} not found`);

      // Restore original method
      timelineController.deleteById = originalDeleteById;
    });
  });

  describe('deleteAllUserTimelines', () => {
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

    it('should delete all timelines for specific user', async () => {
      const result = await timelineController.deleteAllUserTimelines('user123');

      expect(result).toBe(2);

      // Verify timelines are deleted
      const remainingTimelines = await Timeline.find({ userId: 'user123' });
      expect(remainingTimelines).toHaveLength(0);

      // Verify other user's timelines remain
      const otherUserTimelines = await Timeline.find({ userId: 'user456' });
      expect(otherUserTimelines).toHaveLength(1);
    });

    it('should return 0 for user with no timelines', async () => {
      const result =
        await timelineController.deleteAllUserTimelines('nonexistent');

      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      // Mock deleteMany to return error
      const originalDeleteMany = timelineController.deleteMany;
      timelineController.deleteMany = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      await expect(
        timelineController.deleteAllUserTimelines('user123'),
      ).rejects.toThrow('Failed to delete timelines');

      // Restore original method
      timelineController.deleteMany = originalDeleteMany;
    });
  });

  describe('formatTimelineResponse', () => {
    it('should format timeline response correctly', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        items: [
          {
            _id: 'item1',
            season: 'fall',
            year: 2023,
            courses: ['COMP101', 'MATH101'],
          },
        ],
        isExtendedCredit: false,
      };

      const result = await timelineController.saveTimeline(timelineData);

      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('user_id', 'user123');
      expect(result).toHaveProperty('name', 'Test Timeline');
      expect(result).toHaveProperty('degree_id', 'COMP');
      expect(result).toHaveProperty('isExtendedCredit', false);
      expect(result).toHaveProperty('last_modified');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('season', 'fall');
      expect(result.items[0]).toHaveProperty('year', 2023);
      expect(result.items[0]).toHaveProperty('courses', ['COMP101', 'MATH101']);
    });

    it('should handle timeline with no items', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'Empty Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false,
      };

      const result = await timelineController.saveTimeline(timelineData);

      expect(result.items).toHaveLength(0);
    });

    it('should handle timeline with items having no courses', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'Timeline with Empty Courses',
        degree_id: 'COMP',
        items: [
          {
            season: 'fall',
            year: 2023,
            courses: [],
          },
        ],
        isExtendedCredit: false,
      };

      const result = await timelineController.saveTimeline(timelineData);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].courses).toHaveLength(0);
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle saveTimeline when upsert returns error', async () => {
      const originalUpsert = timelineController.upsert;
      timelineController.upsert = jest.fn().mockResolvedValue({
        success: false,
        error: 'Upsert failed',
      });

      const timelineData = {
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        items: [],
        isExtendedCredit: false,
      };

      await expect(
        timelineController.saveTimeline(timelineData),
      ).rejects.toThrow('Failed to save timeline');

      timelineController.upsert = originalUpsert;
    });

    it('should handle getTimelinesByUser when findAll returns no data', async () => {
      const originalFindAll = timelineController.findAll;
      timelineController.findAll = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await timelineController.getTimelinesByUser('user123');
      expect(result).toEqual([]);

      timelineController.findAll = originalFindAll;
    });

    it('should handle getTimelinesByUser when findAll returns error', async () => {
      const originalFindAll = timelineController.findAll;
      timelineController.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      await expect(
        timelineController.getTimelinesByUser('user123'),
      ).rejects.toThrow('Failed to fetch timelines');

      timelineController.findAll = originalFindAll;
    });

    it('should handle getTimelineById when findById returns error', async () => {
      const originalFindById = timelineController.findById;
      timelineController.findById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Not found',
      });

      await expect(
        timelineController.getTimelineById('test123'),
      ).rejects.toThrow('Timeline not found');

      timelineController.findById = originalFindById;
    });

    it('should handle updateTimeline when updateById returns error', async () => {
      const originalUpdateById = timelineController.updateById;
      timelineController.updateById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      await expect(
        timelineController.updateTimeline('test123', { name: 'Updated' }),
      ).rejects.toThrow('Timeline not found');

      timelineController.updateById = originalUpdateById;
    });

    it('should handle deleteAllUserTimelines when deleteMany returns no data', async () => {
      const originalDeleteMany = timelineController.deleteMany;
      timelineController.deleteMany = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await timelineController.deleteAllUserTimelines('user123');
      expect(result).toBe(0);

      timelineController.deleteMany = originalDeleteMany;
    });

    it('should handle deleteAllUserTimelines when deleteMany returns error', async () => {
      const originalDeleteMany = timelineController.deleteMany;
      timelineController.deleteMany = jest.fn().mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });

      await expect(
        timelineController.deleteAllUserTimelines('user123'),
      ).rejects.toThrow('Failed to delete timelines');

      timelineController.deleteMany = originalDeleteMany;
    });

    it('should handle formatTimelineResponse with items having undefined _id', async () => {
      const timelineData = {
        user_id: 'user123',
        name: 'Test Timeline',
        degree_id: 'COMP',
        items: [
          {
            season: 'fall',
            year: 2023,
            courses: ['COMP101'],
            // _id is undefined
          },
        ],
        isExtendedCredit: false,
      };

      const result = await timelineController.saveTimeline(timelineData);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].season).toBe('fall');
    });

    it('should handle formatTimelineResponse with undefined items array', async () => {
      await Timeline.create({
        _id: new mongoose.Types.ObjectId().toString(),
        userId: 'user123',
        name: 'No Items Timeline',
        degreeId: 'COMP',
        isExtendedCredit: false,
        // items is undefined
      });

      const result = await timelineController.getTimelinesByUser('user123');
      expect(result).toHaveLength(1);
      expect(result[0].items).toEqual([]);
    });

    it('should handle removeUserTimeline when deleteById returns success false', async () => {
      const originalDeleteById = timelineController.deleteById;
      timelineController.deleteById = jest.fn().mockResolvedValue({
        success: false,
        error: 'Not found',
      });

      const result = await timelineController.removeUserTimeline('fake123');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');

      timelineController.deleteById = originalDeleteById;
    });
  });
});
