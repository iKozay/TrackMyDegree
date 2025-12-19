const mockConnect = jest.fn();
const mockOn = jest.fn();
const mockRedisClient = {
  connect: mockConnect,
  on: mockOn,
  isReady: false,
};

const mockCreateClient = jest.fn(() => mockRedisClient);
const mockSentryCapture = jest.fn();

jest.mock('redis', () => ({
  createClient: mockCreateClient,
}));

jest.mock('@sentry/node', () => ({
  captureException: mockSentryCapture,
}));

describe('Redis Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('creates Redis client with correct URL from environment', () => {
    const originalEnv = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://custom-redis:6380';

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: 'redis://custom-redis:6380',
    });

    process.env.REDIS_URL = originalEnv;
  });

  it('uses default Redis URL when REDIS_URL is not set', () => {
    const originalEnv = process.env.REDIS_URL;
    delete process.env.REDIS_URL;

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });

    if (originalEnv !== undefined) {
      process.env.REDIS_URL = originalEnv;
    }
  });

  it('sets up error event handler', () => {
    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('sets up connect event handler', () => {
    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('handles Redis errors correctly', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    const errorHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'error',
    )[1];
    const testError = new Error('Redis connection failed');

    errorHandler(testError);

    expect(mockSentryCapture).toHaveBeenCalledWith(testError, {
      extra: { error: 'Redis Client Error' },
    });
    expect(consoleSpy).toHaveBeenCalledWith('Redis Client Error:', testError);
    consoleSpy.mockRestore();
  });

  it('logs successful connection', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    const connectHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'connect',
    )[1];
    connectHandler();

    expect(consoleSpy).toHaveBeenCalledWith('Connected to Redis server');
    consoleSpy.mockRestore();
  });
});
