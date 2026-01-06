// lib/cache.test.js

// --- Mock redisClient (default export) ---
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();
const mockExpire = jest.fn();
const mockSetEx = jest.fn();
const mockKeys = jest.fn();


jest.mock('../lib/redisClient', () => ({
  __esModule: true,
  default: {
    set: mockSet,
    get: mockGet,
    del: mockDel,
    expire: mockExpire,
    setEx: mockSetEx,
    keys: mockKeys,
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

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      'job:timeline:job-123',
      JSON.stringify(payload),
    );
  });

  test('getJobResult returns parsed object when value exists', async () => {
    const jobId = 'job-456';
    const storedPayload = { payload: { status: 'done', data: [1, 2, 3] } };

    mockGet.mockResolvedValueOnce(JSON.stringify(storedPayload));

    const result = await getJobResult(jobId);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('job:timeline:job-456');
    expect(result).toEqual(storedPayload);
  });

  test('getJobResult returns null when key is missing / expired', async () => {
    const jobId = 'job-missing';

    mockGet.mockResolvedValueOnce(null); // simulate missing key

    const result = await getJobResult(jobId);

    expect(mockGet).toHaveBeenCalledWith('job:timeline:job-missing');
    expect(result).toBeNull();
  });

  test('deleteJobResult calls del with the correct key', async () => {
    const jobId = 'job-del-789';

    await deleteJobResult(jobId);

    expect(mockDel).toHaveBeenCalledTimes(1);
    expect(mockDel).toHaveBeenCalledWith('job:timeline:job-del-789');
  });

  test('extendJobTTL calls expire with the correct key and TTL', async () => {
    const jobId = 'job-ttl-999';

    await extendJobTTL(jobId);

    // TTL is 60 * 60 = 3600
    expect(mockExpire).toHaveBeenCalledTimes(1);
    expect(mockExpire).toHaveBeenCalledWith('job:timeline:job-ttl-999', 3600);
  });

  test('cacheGet returns null when redis returns null', async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(cacheGet('k1')).resolves.toBeNull();
  });

  test('cacheGet parses when redis returns string JSON', async () => {
    mockGet.mockResolvedValueOnce('{"a":1}');
    await expect(cacheGet('k2')).resolves.toEqual({ a: 1 });
  });

  test('cacheGet parses when redis returns Uint8Array (Buffer branch)', async () => {
    const json = '{"b":2}';
    const u8 = Uint8Array.from(json.split('').map(c => c.charCodeAt(0)));

    mockGet.mockResolvedValueOnce(u8);

    await expect(cacheGet('k3')).resolves.toEqual({ b: 2 });
  });

  test('cacheGet hits fallback conversion and returns null on invalid JSON (catch branch)', async () => {
    mockGet.mockResolvedValueOnce({ hello: 'world' }); // String(...) => "[object Object]" => invalid JSON
    await expect(cacheGet('k4')).resolves.toBeNull();
  });

  //cacheSet/cacheDel/cacheDelPattern ---

  test('cacheSet uses setEx with ttl and JSON string', async () => {
    await cacheSet('k5', { z: 9 }, 10);
    expect(mockSetEx).toHaveBeenCalledWith('k5', 10, '{"z":9}');
  });

  test('cacheDel calls del with key', async () => {
    await cacheDel('k6');
    expect(mockDel).toHaveBeenCalledWith('k6');
  });

  test('cacheDelPattern does nothing when no keys', async () => {
    mockKeys.mockResolvedValueOnce([]);
    await cacheDelPattern('job:*');
    expect(mockDel).not.toHaveBeenCalled();
  });

  test('cacheDelPattern deletes all matching keys when keys exist', async () => {
    mockKeys.mockResolvedValueOnce(['a', 'b']);
    await cacheDelPattern('job:*');
    expect(mockDel).toHaveBeenCalledWith(['a', 'b']);
  });
});
