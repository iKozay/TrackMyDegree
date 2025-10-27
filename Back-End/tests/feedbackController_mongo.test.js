const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const submitFeedback = require('../dist/controllers/feedbackController/feedbackController_mongo').default;
const { Feedback } = require('../dist/models/Feedback');

describe('Feedback Controller', () => {
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

  beforeEach(async () => await Feedback.deleteMany({}));

  test('should handle existing user_id', async () => {
    const message = 'Test message';
    const user_id = 'user-id-123';

    // Test truthy user_id branch
    const result = await submitFeedback(message, user_id);
    expect(result).toHaveProperty('id');
    expect(result.user_id).toBe(user_id);
    expect(result.message).toBe(message);
    expect(result).toHaveProperty('submitted_at');
    expect(await Feedback.findById(result.id)).toBeTruthy();
  });

  test('should handle anonymous feedback (null user_id)', async () => {
    const message = 'Anonymous feedback';
    const user_id = null;

    const result = await submitFeedback(message, user_id);
    expect(result).toHaveProperty('id');
    expect(result.user_id).toBeNull();
    expect(result.message).toBe(message);
    expect(result).toHaveProperty('submitted_at');
    expect(await Feedback.findById(result.id)).toBeTruthy();
  });

  test('should handle errors', async () => {
    await mongoose.disconnect();
    await expect(submitFeedback('Fail', 'user')).rejects.toThrow();
    await mongoose.connect(mongoUri);
  });
});