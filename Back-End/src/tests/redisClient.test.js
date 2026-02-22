const mockConnect = jest.fn();
const mockOn = jest.fn();
const mockIsOpen = false;

const mockCacheClient = {
  connect: mockConnect,
  on: mockOn,
  isOpen: mockIsOpen,
};

const mockJobClient = {
  connect: mockConnect,
  on: mockOn,
  isOpen: mockIsOpen,
};

const mockCreateClient = jest.fn((config) => {
  if (config.url.includes('/0')) return mockCacheClient;
  if (config.url.includes('/1')) return mockJobClient;
  return mockCacheClient;
});

const mockSentryCapture = jest.fn();

jest.mock('redis', () => ({
  createClient: mockCreateClient,
}));

jest.mock('@sentry/node', () => ({
  __esModule: true,
  default: {
    captureException: mockSentryCapture,
  },
}));

describe('Redis Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('creates cache Redis client with correct URL', () => {
    const originalEnv = process.env.REDIS_CACHE_URL;
    process.env.REDIS_CACHE_URL = 'redis://custom:6380/0';

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: 'redis://custom:6380/0',
    });

    process.env.REDIS_CACHE_URL = originalEnv;
  });

  it('creates job Redis client with correct URL', () => {
    const originalEnv = process.env.REDIS_JOB_URL;
    process.env.REDIS_JOB_URL = 'redis://custom:6380/1';

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: 'redis://custom:6380/1',
    });

    process.env.REDIS_JOB_URL = originalEnv;
  });

  it('uses default URLs when env vars not set', () => {
    const origCache = process.env.REDIS_CACHE_URL;
    const origJob = process.env.REDIS_JOB_URL;
    delete process.env.REDIS_CACHE_URL;
    delete process.env.REDIS_JOB_URL;

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379/0',
    });
    expect(mockCreateClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379/1',
    });

    if (origCache) process.env.REDIS_CACHE_URL = origCache;
    if (origJob) process.env.REDIS_JOB_URL = origJob;
  });

  it('sets up error handlers for both clients', () => {
    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledTimes(4); // 2 clients × 2 events
  });

  it('handles cache Redis errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    const errorHandler = mockOn.mock.calls.find(
      (call) => call[0] === 'error',
    )[1];
    const testError = new Error('Cache Redis failed');

    errorHandler(testError);

    expect(mockSentryCapture).toHaveBeenCalledWith(testError, {
      extra: { error: 'Cache Redis Error' },
    });
    expect(consoleSpy).toHaveBeenCalledWith('Cache Redis Error:', testError);
    consoleSpy.mockRestore();
  });

  it('logs successful connections', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    jest.isolateModules(() => {
      require('@lib/redisClient');
    });

    const connectHandlers = mockOn.mock.calls.filter(
      (call) => call[0] === 'connect',
    );
    connectHandlers.forEach((handler) => handler[1]());

    expect(consoleSpy).toHaveBeenCalledWith('Connected to Cache Redis (db 0)');
    expect(consoleSpy).toHaveBeenCalledWith('Connected to Job Redis (db 1)');
    consoleSpy.mockRestore();
  });

  it('connectRedis connects both clients when not open', async () => {
    jest.isolateModules(async () => {
      const { connectRedis } = require('@lib/redisClient');
      await connectRedis();
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  it('connectJobRedis connects only job client', async () => {
    jest.isolateModules(async () => {
      const { connectJobRedis } = require('@lib/redisClient');
      await connectJobRedis();
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });
});