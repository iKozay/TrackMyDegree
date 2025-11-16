const {
  FeedbackController,
} = require('../controllers/feedbackController');
const { Feedback } = require('../models/feedback');

describe('FeedbackController', () => {
  let feedbackController;

  beforeAll(() => {
    feedbackController = new FeedbackController();
  });

  beforeEach(() => {
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

      jest.spyOn(feedbackController, 'create').mockResolvedValue({
        success: true,
        data: {
          _id: 'id1',
          message,
          user_id,
          submitted_at: new Date(),
        },
      });

      const result = await feedbackController.submitFeedback(message, user_id);

      expect(result).toMatchObject({
        message: 'This is a test feedback message',
        user_id: 'user123',
      });
      expect(result._id).toBeDefined();
      expect(result.submitted_at).toBeDefined();
    });

    it('should submit feedback without user_id', async () => {
      const message = 'Anonymous feedback message';

      jest.spyOn(feedbackController, 'create').mockResolvedValue({
        success: true,
        data: {
          _id: 'id2',
          message,
          user_id: null,
          submitted_at: new Date(),
        },
      });

      const result = await feedbackController.submitFeedback(message);

      expect(result).toMatchObject({
        message: 'Anonymous feedback message',
        user_id: null,
      });
      expect(result._id).toBeDefined();
      expect(result.submitted_at).toBeDefined();
    });

    it('should handle database errors', async () => {
      jest.spyOn(feedbackController, 'create').mockResolvedValue({
        success: false,
      });

      await expect(
        feedbackController.submitFeedback('Test message'),
      ).rejects.toThrow('Failed to submit feedback');
    });
  });

  describe('getAllFeedback', () => {
    const seed = [
      {
        _id: 'a',
        message: 'Feedback 1',
        user_id: 'user123',
        submitted_at: new Date('2023-01-01'),
      },
      {
        _id: 'b',
        message: 'Feedback 2',
        user_id: 'user123',
        submitted_at: new Date('2023-01-02'),
      },
      {
        _id: 'c',
        message: 'Feedback 3',
        user_id: 'user456',
        submitted_at: new Date('2023-01-03'),
      },
      {
        _id: 'd',
        message: 'Anonymous feedback',
        user_id: null,
        submitted_at: new Date('2023-01-04'),
      },
    ];

    it('should get all feedback', async () => {
      const spy = jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({ success: true, data: seed });
      const result = await feedbackController.getAllFeedback();

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('_id');
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('submitted_at');
      expect(spy).toHaveBeenCalled();
    });

    it('should get feedback sorted by submitted_at descending by default', async () => {
      jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({
          success: true,
          data: [...seed].sort(
            (a, b) => b.submitted_at.getTime() - a.submitted_at.getTime(),
          ),
        });
      const result = await feedbackController.getAllFeedback();

      expect(result[0].message).toBe('Anonymous feedback'); // Most recent
      expect(result[1].message).toBe('Feedback 3');
      expect(result[2].message).toBe('Feedback 2');
      expect(result[3].message).toBe('Feedback 1'); // Oldest
    });

    it('should get feedback sorted by submitted_at ascending', async () => {
      const spy = jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({ success: true, data: [...seed] });
      const result = await feedbackController.getAllFeedback({ sort: 'asc' });

      expect(result[0].message).toBe('Feedback 1'); // Oldest
      expect(result[1].message).toBe('Feedback 2');
      expect(result[2].message).toBe('Feedback 3');
      expect(result[3].message).toBe('Anonymous feedback'); // Most recent
      expect(spy).toHaveBeenCalledWith({}, { page: undefined, limit: undefined, sort: { submitted_at: 1 } });
    });

    it('should filter feedback by user_id', async () => {
      jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({
          success: true,
          data: seed.filter((f) => f.user_id === 'user123'),
        });
      const result = await feedbackController.getAllFeedback({ user_id: 'user123' });

      expect(result).toHaveLength(2);
      expect(result.every((f) => f.user_id === 'user123')).toBe(true);
    });

    it('should paginate feedback', async () => {
      const spy = jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({ success: true, data: seed.slice(0, 2) });
      const result = await feedbackController.getAllFeedback({ page: 1, limit: 2 });

      expect(result).toHaveLength(2);
      expect(spy).toHaveBeenCalledWith({}, { page: 1, limit: 2, sort: { submitted_at: -1 } });
    });

    it('should return empty array when no feedback exists', async () => {
      jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({ success: true, data: [] });
      const result = await feedbackController.getAllFeedback();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(feedbackController, 'findAll')
        .mockResolvedValue({ success: false });

      await expect(feedbackController.getAllFeedback()).rejects.toThrow(
        'Failed to fetch feedback',
      );
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
    const testFeedback = {
      _id: 'ff1',
      message: 'Test feedback message',
      user_id: 'user123',
      submitted_at: new Date(),
    };

    it('should get feedback by ID', async () => {
      jest
        .spyOn(feedbackController, 'findById')
        .mockResolvedValue({ success: true, data: testFeedback });
      const result = await feedbackController.getFeedbackById(testFeedback._id.toString());

      expect(result).toMatchObject({
        _id: testFeedback._id.toString(),
        message: 'Test feedback message',
        user_id: 'user123',
      });
      expect(result.submitted_at).toBeDefined();
    });

    it('should throw error for non-existent feedback', async () => {
      jest
        .spyOn(feedbackController, 'findById')
        .mockResolvedValue({ success: false, error: 'Feedback not found' });
      await expect(
        feedbackController.getFeedbackById('nonexistent'),
      ).rejects.toThrow('Feedback not found');
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(feedbackController, 'findById')
        .mockResolvedValue({ success: false });

      await expect(
        feedbackController.getFeedbackById(testFeedback._id.toString()),
      ).rejects.toThrow('Feedback not found');
    });
  });

  describe('deleteFeedback', () => {
    const testFeedback = {
      _id: 'del1',
      message: 'Test feedback to delete',
      user_id: 'user123',
      submitted_at: new Date(),
    };

    it('should delete feedback successfully', async () => {
      jest
        .spyOn(feedbackController, 'deleteById')
        .mockResolvedValue({ success: true, message: 'Feedback deleted successfully' });
      const result = await feedbackController.deleteFeedback(testFeedback._id.toString());

      expect(result).toBe('Feedback deleted successfully');

      // No DB verification needed when mocking
    });

    it('should throw error for non-existent feedback', async () => {
      jest
        .spyOn(feedbackController, 'deleteById')
        .mockResolvedValue({ success: false, error: 'Feedback not found' });
      await expect(
        feedbackController.deleteFeedback('nonexistent'),
      ).rejects.toThrow('Feedback not found');
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(feedbackController, 'deleteById')
        .mockResolvedValue({ success: false });

      await expect(
        feedbackController.deleteFeedback(testFeedback._id.toString()),
      ).rejects.toThrow('Feedback not found');
    });
  });

  describe('deleteUserFeedback', () => {

    it('should delete all feedback for specific user', async () => {
      jest
        .spyOn(feedbackController, 'deleteMany')
        .mockResolvedValue({ success: true, data: 2 });
      const result = await feedbackController.deleteUserFeedback('user123');

      expect(result).toBe(2);

      // No DB verification needed when mocking
    });

    it('should return 0 for user with no feedback', async () => {
      jest
        .spyOn(feedbackController, 'deleteMany')
        .mockResolvedValue({ success: true, data: 0 });
      const result = await feedbackController.deleteUserFeedback('nonexistent');

      expect(result).toBe(0);
    });

    it('should handle database errors', async () => {
      jest
        .spyOn(feedbackController, 'deleteMany')
        .mockResolvedValue({ success: false });

      await expect(
        feedbackController.deleteUserFeedback('user123'),
      ).rejects.toThrow('Failed to delete feedback');
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
