const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  FeedbackController,
} = require('../dist/controllers/mondoDBControllers/FeedbackController');
const { Feedback } = require('../dist/models/Feedback');

describe('FeedbackController', () => {
  let mongoServer, mongoUri, feedbackController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    feedbackController = new FeedbackController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Feedback.deleteMany({});
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with Feedback model', () => {
      expect(feedbackController.model).toBe(Feedback);
      expect(feedbackController.modelName).toBe('Feedback');
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback with user_id', async () => {
      const message = 'This is a test feedback message';
      const user_id = 'user123';

      const result = await feedbackController.submitFeedback(message, user_id);

      expect(result).toMatchObject({
        message: 'This is a test feedback message',
        user_id: 'user123',
      });
      expect(result.id).toBeDefined();
      expect(result.submitted_at).toBeDefined();
    });

    it('should submit feedback without user_id', async () => {
      const message = 'Anonymous feedback message';

      const result = await feedbackController.submitFeedback(message);

      expect(result).toMatchObject({
        message: 'Anonymous feedback message',
        user_id: null,
      });
      expect(result.id).toBeDefined();
      expect(result.submitted_at).toBeDefined();
    });

    it('should handle database errors', async () => {
      // Mock Feedback.create to throw an error
      const originalCreate = Feedback.create;
      Feedback.create = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        feedbackController.submitFeedback('Test message'),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      Feedback.create = originalCreate;
    });
  });

  describe('getAllFeedback', () => {
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
      const result = await feedbackController.getAllFeedback();

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('submitted_at');
    });

    it('should get feedback sorted by submitted_at descending by default', async () => {
      const result = await feedbackController.getAllFeedback();

      expect(result[0].message).toBe('Anonymous feedback'); // Most recent
      expect(result[1].message).toBe('Feedback 3');
      expect(result[2].message).toBe('Feedback 2');
      expect(result[3].message).toBe('Feedback 1'); // Oldest
    });

    it('should get feedback sorted by submitted_at ascending', async () => {
      const result = await feedbackController.getAllFeedback({ sort: 'asc' });

      expect(result[0].message).toBe('Feedback 1'); // Oldest
      expect(result[1].message).toBe('Feedback 2');
      expect(result[2].message).toBe('Feedback 3');
      expect(result[3].message).toBe('Anonymous feedback'); // Most recent
    });

    it('should filter feedback by user_id', async () => {
      const result = await feedbackController.getAllFeedback({
        user_id: 'user123',
      });

      expect(result).toHaveLength(2);
      expect(result.every((f) => f.user_id === 'user123')).toBe(true);
    });

    it('should paginate feedback', async () => {
      const result = await feedbackController.getAllFeedback({
        page: 1,
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no feedback exists', async () => {
      await Feedback.deleteMany({});
      const result = await feedbackController.getAllFeedback();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Mock Feedback.find to throw an error
      const originalFind = Feedback.find;
      Feedback.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(feedbackController.getAllFeedback()).rejects.toThrow(
        'Database connection failed',
      );

      // Restore original method
      Feedback.find = originalFind;
    });

    it('should throw error when findAll returns success: false', async () => {
      // Mock the findAll method to return success: false
      const originalFindAll = feedbackController.findAll;
      feedbackController.findAll = jest
        .fn()
        .mockResolvedValue({ success: false });

      await expect(feedbackController.getAllFeedback()).rejects.toThrow(
        'Failed to fetch feedback',
      );

      // Restore original method
      feedbackController.findAll = originalFindAll;
    });

    it('should handle errors from findAll with handleError', async () => {
      // Mock the findAll method to throw an error
      const originalFindAll = feedbackController.findAll;
      const handleErrorSpy = jest.spyOn(feedbackController, 'handleError');
      feedbackController.findAll = jest
        .fn()
        .mockRejectedValue(new Error('Database query failed'));

      await expect(feedbackController.getAllFeedback()).rejects.toThrow();

      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'getAllFeedback',
      );

      // Restore original method
      feedbackController.findAll = originalFindAll;
      handleErrorSpy.mockRestore();
    });
  });

  describe('getFeedbackById', () => {
    let testFeedback;

    beforeEach(async () => {
      testFeedback = await Feedback.create({
        message: 'Test feedback message',
        user_id: 'user123',
        submitted_at: new Date(),
      });
    });

    it('should get feedback by ID', async () => {
      const result = await feedbackController.getFeedbackById(
        testFeedback._id.toString(),
      );

      expect(result).toMatchObject({
        id: testFeedback._id.toString(),
        message: 'Test feedback message',
        user_id: 'user123',
      });
      expect(result.submitted_at).toBeDefined();
    });

    it('should throw error for non-existent feedback', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(feedbackController.getFeedbackById(fakeId)).rejects.toThrow(
        'Feedback not found',
      );
    });

    it('should handle database errors', async () => {
      // Mock Feedback.findById to throw an error
      const originalFindById = Feedback.findById;
      Feedback.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        feedbackController.getFeedbackById(testFeedback._id.toString()),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      Feedback.findById = originalFindById;
    });
  });

  describe('deleteFeedback', () => {
    let testFeedback;

    beforeEach(async () => {
      testFeedback = await Feedback.create({
        message: 'Test feedback to delete',
        user_id: 'user123',
        submitted_at: new Date(),
      });
    });

    it('should delete feedback successfully', async () => {
      const result = await feedbackController.deleteFeedback(
        testFeedback._id.toString(),
      );

      expect(result).toBe('Feedback deleted successfully');

      // Verify feedback is deleted
      const deletedFeedback = await Feedback.findById(testFeedback._id);
      expect(deletedFeedback).toBeNull();
    });

    it('should throw error for non-existent feedback', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(feedbackController.deleteFeedback(fakeId)).rejects.toThrow(
        'Feedback not found',
      );
    });

    it('should handle database errors', async () => {
      // Mock Feedback.findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = Feedback.findByIdAndDelete;
      Feedback.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        feedbackController.deleteFeedback(testFeedback._id.toString()),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      Feedback.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });

  describe('deleteUserFeedback', () => {
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

    it('should delete all feedback for specific user', async () => {
      const result = await feedbackController.deleteUserFeedback('user123');

      expect(result).toBe(2);

      // Verify user's feedback is deleted
      const userFeedback = await Feedback.find({ user_id: 'user123' });
      expect(userFeedback).toHaveLength(0);

      // Verify other user's feedback remains
      const otherUserFeedback = await Feedback.find({ user_id: 'user456' });
      expect(otherUserFeedback).toHaveLength(1);
    });

    it('should return 0 for user with no feedback', async () => {
      const result = await feedbackController.deleteUserFeedback('nonexistent');

      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      // Mock Feedback.deleteMany to throw an error
      const originalDeleteMany = Feedback.deleteMany;
      Feedback.deleteMany = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        feedbackController.deleteUserFeedback('user123'),
      ).rejects.toThrow('Database connection failed');

      // Restore original method
      Feedback.deleteMany = originalDeleteMany;
    });

    it('should throw error when deleteMany returns success: false', async () => {
      // Mock the deleteMany method to return success: false
      const originalDeleteMany = feedbackController.deleteMany;
      feedbackController.deleteMany = jest
        .fn()
        .mockResolvedValue({ success: false });

      await expect(
        feedbackController.deleteUserFeedback('user123'),
      ).rejects.toThrow('Failed to delete feedback');

      // Restore original method
      feedbackController.deleteMany = originalDeleteMany;
    });

    it('should handle errors from deleteMany with handleError', async () => {
      // Mock the deleteMany method to throw an error
      const originalDeleteMany = feedbackController.deleteMany;
      const handleErrorSpy = jest.spyOn(feedbackController, 'handleError');
      feedbackController.deleteMany = jest
        .fn()
        .mockRejectedValue(new Error('Delete operation failed'));

      await expect(
        feedbackController.deleteUserFeedback('user123'),
      ).rejects.toThrow();

      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'deleteUserFeedback',
      );

      // Restore original method
      feedbackController.deleteMany = originalDeleteMany;
      handleErrorSpy.mockRestore();
    });
  });
});
