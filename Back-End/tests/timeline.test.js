jest.mock("../dist/controllers/timelineController/timelineController", () => ({
  __esModule: true,
  default: {
    createTimeline: jest.fn(),
    removeTimelineItem: jest.fn(),
    getAllTimelines: jest.fn()
  }
}));

const request = require("supertest");
const express = require("express");
const router = require("../dist/routes/timeline").default;
const controller = require("../dist/controllers/timelineController/timelineController").default;
const DB_OPS = require("../dist/Util/DB_Ops").default;

const app = express();
app.use(express.json());
app.use("/timeline", router);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

describe("Timeline Routes", () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /timeline/create", () => {
    it("should create a timeline successfully with all courses", async () => {
      const payload = {
        user_id: "1",
        timeline_items: [
          {
            coursecode: "SOEN363",
            season: "Fall",
            year: 2024
          },
          {
            coursecode: "SOEN287",
            season: "Winter",
            year: 2025
          }
        ]
      };

      controller.createTimeline.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post("/timeline/create")
        .send(payload)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("res", "All courses added to user timeline");
    });

    it("should return partial success when some courses couldn't be added", async () => {
      const payload = {
        user_id: "1",
        timeline_items: [
          {
            coursecode: "COMP335",
            season: "Fall",
            year: 2024
          },
          {
            coursecode: "INVALID101",
            season: "Fall",
            year: 2024
          }
        ]
      };

      controller.createTimeline.mockResolvedValue(DB_OPS.MOSTLY_OK);

      const response = await request(app)
        .post("/timeline/create")
        .send(payload)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("res", "Some courses were not added to user timeline");
    });

    it("should return 400 when payload is missing", async () => {
      const response = await request(app)
        .post("/timeline/create")
        .send({})
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Payload of type UserTimeline is required for create.");
    });
  });

  describe("POST /timeline/getAll", () => {
    it("should return timeline items grouped by semester", async () => {
      const request_body = { user_id: "1" };

      controller.getAllTimelines.mockResolvedValue({
        "Fall 2024": [{ timeline_item_id: "1", coursecode: "SOEN363" }],
        "Winter 2025": []
      });

      const response = await request(app)
        .post("/timeline/getAll")
        .send(request_body)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(Object.keys(response.body).length).toBeGreaterThan(0);
      const first_semester = response.body[Object.keys(response.body)[0]];
      expect(Array.isArray(first_semester)).toBe(true);
    });

    it("should return 500 when no timelines found", async () => {
      controller.getAllTimelines.mockResolvedValue({});

      const response = await request(app)
        .post("/timeline/getAll")
        .send({ user_id: "nonexistent_user" })
        .expect("Content-Type", /json/)
        .expect(500);

      expect(response.body).toHaveProperty("error", "Timeline could not be fetched");
    });

    it("should return 400 when user_id is missing", async () => {
      const response = await request(app)
        .post("/timeline/getAll")
        .send({})
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error", "User ID is required to get timeline.");
    });
  });

  describe("POST /timeline/delete", () => {
    it("should delete timeline item successfully", async () => {
      const request_body = { timeline_item_id: "1" };
      controller.removeTimelineItem.mockResolvedValue(DB_OPS.SUCCESS);

      const response = await request(app)
        .post("/timeline/delete")
        .send(request_body)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("message", "Item removed from timeline");
    });

    it("should return 404 when timeline item not found", async () => {
      controller.removeTimelineItem.mockResolvedValue(DB_OPS.MOSTLY_OK);

      const response = await request(app)
        .post("/timeline/delete")
        .send({ timeline_item_id: "nonexistent_item" })
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Item not found in timeline");
    });

    it("should return 400 when timeline_item_id is missing", async () => {
      const response = await request(app)
        .post("/timeline/delete")
        .send({})
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Timeline item ID is required to remove item from timeline.");
    });
  });
});
