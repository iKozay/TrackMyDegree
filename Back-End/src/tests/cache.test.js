// lib/cache.test.js

const mockCacheGet = jest.fn();
const mockCacheSetEx = jest.fn();
const mockCacheDel = jest.fn();
const mockCacheKeys = jest.fn();
const mockJobGet = jest.fn();
const mockJobSetEx = jest.fn();
const mockJobDel = jest.fn();
const mockJobExpire = jest.fn();

jest.mock('../lib/redisClient', () => ({
  __esModule: true,
  cacheRedisClient: {
    get: mockCacheGet,
    setEx: mockCacheSetEx,
    del: mockCacheDel,
    keys: mockCacheKeys,
  },
  jobRedisClient: {
    get: mockJobGet,
    setEx: mockJobSetEx,
    del: mockJobDel,
    expire: mockJobExpire,
  },
  default: {
    get: mockCacheGet,
    setEx: mockCacheSetEx,
    del: mockCacheDel,
    keys: mockCacheKeys,
  },
}));

// Import after mocks so they take effect
const {
  cacheJobResult,
  getJobResult,
  deleteJobResult,
  extendJobTTL,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
} = require('../lib/cache');

describe('cache helpers (lib/cache)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cacheJobResult stores JSON string at the correct key', async () => {
    const jobId = 'job-123';
    const payload = { foo: 'bar' };

    await cacheJobResult(jobId, payload);

    expect(mockJobSetEx).toHaveBeenCalledTimes(1);
    expect(mockJobSetEx).toHaveBeenCalledWith(
      'job:timeline:job-123',
      86400,
      JSON.stringify(payload),
    );
  });

  test('getJobResult returns parsed object when value exists', async () => {
    const jobId = 'job-456';
    const storedPayload = { payload: { status: 'done', data: [1, 2, 3] } };

    mockJobGet.mockResolvedValueOnce(JSON.stringify(storedPayload));

    const result = await getJobResult(jobId);

    expect(mockJobGet).toHaveBeenCalledTimes(1);
    expect(mockJobGet).toHaveBeenCalledWith('job:timeline:job-456');
    expect(result).toEqual(storedPayload);
  });

  test('getJobResult returns null when key is missing / expired', async () => {
    const jobId = 'job-missing';

    mockJobGet.mockResolvedValueOnce(null);

    const result = await getJobResult(jobId);

    expect(mockJobGet).toHaveBeenCalledWith('job:timeline:job-missing');
    expect(result).toBeNull();
  });

  test('deleteJobResult calls del with the correct key', async () => {
    const jobId = 'job-del-789';

    await deleteJobResult(jobId);

    expect(mockJobDel).toHaveBeenCalledTimes(1);
    expect(mockJobDel).toHaveBeenCalledWith('job:timeline:job-del-789');
  });

  test('extendJobTTL calls expire with the correct key and TTL', async () => {
    const jobId = 'job-ttl-999';

    await extendJobTTL(jobId);

    expect(mockJobExpire).toHaveBeenCalledTimes(1);
    expect(mockJobExpire).toHaveBeenCalledWith('job:timeline:job-ttl-999', 3600);
  });

  test('cacheGet returns null when redis returns null', async () => {
    mockCacheGet.mockResolvedValueOnce(null);
    await expect(cacheGet('k1')).resolves.toBeNull();
  });

  test('cacheGet parses when redis returns string JSON', async () => {
    mockCacheGet.mockResolvedValueOnce('{"a":1}');
    await expect(cacheGet('k2')).resolves.toEqual({ a: 1 });
  });

  test('cacheGet parses when redis returns Uint8Array (Buffer branch)', async () => {
    const json = '{"b":2}';
    const u8 = Uint8Array.from(json.split('').map(c => c.charCodeAt(0)));

    mockCacheGet.mockResolvedValueOnce(u8);

    await expect(cacheGet('k3')).resolves.toEqual({ b: 2 });
  });

  test('cacheGet hits fallback conversion and returns null on invalid JSON (catch branch)', async () => {
    mockCacheGet.mockResolvedValueOnce({ hello: 'world' });
    await expect(cacheGet('k4')).resolves.toBeNull();
  });

  test('cacheSet uses setEx with ttl and JSON string', async () => {
    await cacheSet('k5', { z: 9 }, 10);
    expect(mockCacheSetEx).toHaveBeenCalledWith('k5', 10, '{"z":9}');
  });

  test('cacheDel calls del with key', async () => {
    await cacheDel('k6');
    expect(mockCacheDel).toHaveBeenCalledWith('k6');
  });

  test('cacheDelPattern does nothing when no keys', async () => {
    mockCacheKeys.mockResolvedValueOnce([]);
    await cacheDelPattern('job:*');
    expect(mockCacheDel).not.toHaveBeenCalled();
  });

  test('cacheDelPattern deletes all matching keys when keys exist', async () => {
    mockCacheKeys.mockResolvedValueOnce(['a', 'b']);
    await cacheDelPattern('job:*');
    expect(mockCacheDel).toHaveBeenCalledWith(['a', 'b']);
  });
});