jest.mock("../dist/controllers/courseController/courseController", () => ({
  __esModule: true,
  default: {
    getAllCourses             : jest.fn(),
    getCourseByCode           : jest.fn(),
    addCourse                 : jest.fn(),
    removeCourse              : jest.fn(),
    getCoursesByDegreeGrouped : jest.fn(),
    getAllCoursesInDB         : jest.fn(),
  },
}));

const request = require("supertest");
const express = require("express");
const router = require("../dist/routes/courses").default;
const controller = require("../dist/controllers/courseController/courseController").default;

const courses_mocks = require('./__mocks__/courses_mocks')

const app = express();
app.use(express.json());
app.use("/courses", router);

describe("Course Routes", () => {
  describe("GET /courses/getAll", () => {
    it("should return an array of all courses", async () => {

      //Mock value from controller
      const mockCourses = courses_mocks.getAllMock;
      controller.getAllCourses.mockResolvedValue(mockCourses);

      const response = await request(app)
        .post("/courses/getAll")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert that the response body is an array
      expect(Array.isArray(response.body)).toBe(true);
      // Assert that the response body is an array
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        // Assert structure for the first course
        const course = response.body[0];
        expect(course).toHaveProperty("code");
        expect(course).toHaveProperty("credits");
        expect(course).toHaveProperty("description");
      }
    });
  });

  // Test for adding a course
  describe("POST /courses/add", () => {
    it("should return a success message and course data", async () => {
      //Mocks
      const newCourse = courses_mocks.courseMock;
      controller.addCourse.mockResolvedValue({ code: newCourse.code });

      const response = await request(app)
        .post("/courses/add")
        .send(newCourse)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("code", newCourse.code);
    });

    // Bad request, missing fields
    it("should return 400 status and error message when course data is missing", async () => {
      const response = await request(app)
        .post("/courses/add")
        .send({
          code: "CS101",
        }) // Missing credits and description
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Course data is required  ");
    });
  });

  // Test for getting a course by code
  describe("POST /courses/get", () => {
    it("should return a course object when code and number match", async () => {
      const courseRequest = {
        code: "CS101",
      };

      //Mocks
      const courseRes = courses_mocks.courseMock;
      controller.getCourseByCode.mockResolvedValue(courseRes);

      const response = await request(app)
        .post("/courses/get")
        .send(courseRequest)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("code", courseRequest.code);
      expect(response.body).toHaveProperty("credits");
      expect(response.body).toHaveProperty("description");
    });

    // Not found case
    it("should return 404 status and error message when course is not found", async () => {
      const courseRequest = {
        code: "CS999",
      };

      //Mocks
      controller.getCourseByCode.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/courses/get")
        .send(courseRequest)
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Course not found");
    });

    // Bad request, missing fields
    it("should return 400 status and error message when code missing", async () => {
      const response = await request(app)
        .post("/courses/get")
        .send({
          // missing code field
        })
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Course code is required");
    });
  });

  // Test for removing a course
  describe("POST /courses/remove", () => {
    it("should return a success message when course is removed successfully", async () => {
      const courseRequest = {
        code: "CS101",
      };

      //Mocks
      controller.removeCourse.mockResolvedValue(true);

      const response = await request(app)
        .post("/courses/remove")
        .send(courseRequest)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty(
        "message",
        "Course removed successfully"
      );
    });

    // Not found case for removal
    it("should return 404 status and error message when course to remove does not exist", async () => {
      const courseRequest = {
        code: "CS999",
      };

      //Mocks
      controller.removeCourse.mockResolvedValue(false);

      const response = await request(app)
        .post("/courses/remove")
        .send(courseRequest)
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toHaveProperty("error", "Course not found");
    });

    // Bad request, missing fields
    it("should return 400 status and error message when code missing", async () => {
      const response = await request(app)
        .post("/courses/remove")
        .send({
          // missing code field
        })
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Course code is required");
    });
  });
});
