// controllers/resultController.test.js

// Mock cache module
const mockGetJobResult = jest.fn();

jest.mock("../lib/cache", () => ({
    getJobResult: mockGetJobResult,
}));

// Import after mocks
const { getTimelineByJobId } = require("../controllers/timelineJobController");

const createMockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("getTimelineByJobId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns 404 if jobId is missing", async () => {
        const req = {
            params: {}, // no jobId
        };
        const res = createMockResponse();

        await getTimelineByJobId(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "Job not passed",
        });
        expect(mockGetJobResult).not.toHaveBeenCalled();
    });

    test("returns 410 if cached result is missing/expired", async () => {
        const req = {
            params: { jobId: "job-123" },
        };
        const res = createMockResponse();

        mockGetJobResult.mockResolvedValueOnce(null);

        await getTimelineByJobId(req, res, jest.fn());

        expect(mockGetJobResult).toHaveBeenCalledWith("job-123");
        expect(res.status).toHaveBeenCalledWith(410);
        expect(res.json).toHaveBeenCalledWith({
            error: "result expired",
        });
    });

    test("returns 200 with jobId, status and result when cached data exists", async () => {
        const req = {
            params: { jobId: "job-456" },
        };
        const res = createMockResponse();

        const cached = {
            payload: {
                status: "done",
                data: { timeline: ["step1", "step2"] },
            },
        };

        mockGetJobResult.mockResolvedValueOnce(cached);

        await getTimelineByJobId(req, res, jest.fn());

        expect(mockGetJobResult).toHaveBeenCalledWith("job-456");
        expect(res.json).toHaveBeenCalledWith({
            jobId: "job-456",
            status: "done",
            result: { timeline: ["step1", "step2"] },
        });
    });

    test("returns 500 if getJobResult throws", async () => {
        const req = {
            params: { jobId: "job-error" },
        };
        const res = createMockResponse();

        mockGetJobResult.mockRejectedValueOnce(new Error("redis failure"));

        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => { });

        await getTimelineByJobId(req, res, jest.fn());

        expect(mockGetJobResult).toHaveBeenCalledWith("job-error");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Error fetching result",
        });

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
