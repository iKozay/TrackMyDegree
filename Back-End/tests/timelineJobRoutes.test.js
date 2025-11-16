const express = require("express");
const request = require("supertest");

// --- Mock the controller ---
const mockGetTimelineByJobId = jest.fn((req, res) => {
    return res.status(200).json({
        called: true,
        jobId: req.params.jobId,
    });
});

jest.mock("../controllers/timelineJobController", () => ({
    getTimelineByJobId: mockGetTimelineByJobId,
}));

// --- Import the router AFTER mocks ---
const routerModule = require("../routes/timelineJobRoutes"); // adjust path if needed
const router = routerModule.default || routerModule;

// Build a small app using just this router
const app = express();
app.use(express.json());
app.use("/jobs", router);

describe("GET /jobs/:jobId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("calls getTimelineByJobId with the correct jobId and returns its response", async () => {
        const res = await request(app).get("/jobs/abc123");

        // Controller should be called once
        expect(mockGetTimelineByJobId).toHaveBeenCalledTimes(1);

        // First arg is req → check params
        const reqArg = mockGetTimelineByJobId.mock.calls[0][0];
        expect(reqArg.params.jobId).toBe("abc123");

        // Response should match what the mock sent
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            called: true,
            jobId: "abc123",
        });
    });
});
