// lib/cache.test.js

// --- Mock redisClient (default export) ---
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();
const mockExpire = jest.fn();

jest.mock("../lib/redisClient", () => ({
    __esModule: true,
    default: {
        set: mockSet,
        get: mockGet,
        del: mockDel,
        expire: mockExpire,
    },
}));

// Import after mocks so they take effect
const {
    cacheJobResult,
    getJobResult,
    deleteJobResult,
    extendJobTTL,
} = require("../lib/cache");

describe("cache helpers (lib/cache)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("cacheJobResult stores JSON string at the correct key", async () => {
        const jobId = "job-123";
        const payload = { foo: "bar" };

        await cacheJobResult(jobId, payload);

        expect(mockSet).toHaveBeenCalledTimes(1);
        expect(mockSet).toHaveBeenCalledWith(
            "job:timeline:job-123",
            JSON.stringify(payload)
        );
    });

    test("getJobResult returns parsed object when value exists", async () => {
        const jobId = "job-456";
        const storedPayload = { payload: { status: "done", data: [1, 2, 3] } };

        mockGet.mockResolvedValueOnce(JSON.stringify(storedPayload));

        const result = await getJobResult(jobId);

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith("job:timeline:job-456");
        expect(result).toEqual(storedPayload);
    });

    test("getJobResult returns null when key is missing / expired", async () => {
        const jobId = "job-missing";

        mockGet.mockResolvedValueOnce(null); // simulate missing key

        const result = await getJobResult(jobId);

        expect(mockGet).toHaveBeenCalledWith("job:timeline:job-missing");
        expect(result).toBeNull();
    });

    test("deleteJobResult calls del with the correct key", async () => {
        const jobId = "job-del-789";

        await deleteJobResult(jobId);

        expect(mockDel).toHaveBeenCalledTimes(1);
        expect(mockDel).toHaveBeenCalledWith("job:timeline:job-del-789");
    });

    test("extendJobTTL calls expire with the correct key and TTL", async () => {
        const jobId = "job-ttl-999";

        await extendJobTTL(jobId);

        // TTL is 60 * 60 = 3600
        expect(mockExpire).toHaveBeenCalledTimes(1);
        expect(mockExpire).toHaveBeenCalledWith("job:timeline:job-ttl-999", 3600);
    });
});
