const request = require("supertest");

describe("Course Routes", () => {
    describe("GET /courses/getAll", () => {
        it("should return an array of all courses", async () => {
            const response = await request("http://localhost:8000")
                .post("/courses/getAll")
                .expect("Content-Type", /json/)
                .expect(200);

            // Assert that the response body is an array
            expect(Array.isArray(response.body)).toBe(true);

            if (response.body.length > 0) {
                // Assert structure for the first course
                const course = response.body[0];
                expect(course).toHaveProperty("code");
                expect(course).toHaveProperty("number");
                expect(course).toHaveProperty("credits");
                expect(course).toHaveProperty("description");
            }
        });
    });

    // Test for adding a course
    describe("POST /courses/add", () => {
        it("should return a success message and course data", async () => {
            const newCourse = {
                code: "CS101",
                number: 1,
                credits: 3,
                description: "Introduction to Computer Science",
            };

            const response = await request("http://localhost:8000")
                .post("/courses/add")
                .send(newCourse)
                .expect("Content-Type", /json/)
                .expect(201);

            expect(response.body).toHaveProperty("code", newCourse.code);
            expect(response.body).toHaveProperty("number", newCourse.number);

        });

        // Bad request, missing fields
        it("should return 400 status and error message when course data is missing", async () => {
            const response = await request("http://localhost:8000")
                .post("/courses/add")
                .send({
                    code: "CS101",
                    number: 1,
                }) // Missing credits and description
                .expect("Content-Type", /json/)
                .expect(500);

            expect(response.body).toHaveProperty("error", "Could not add course");
        });
    });

    // Test for getting a course by code and number
    describe("POST /courses/get", () => {
        it("should return a course object when code and number match", async () => {
            const courseRequest = {
                code: "CS101",
                number: 1,
            };

            const response = await request("http://localhost:8000")
                .post("/courses/get")
                .send(courseRequest)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("code", courseRequest.code);
            expect(response.body).toHaveProperty("number", courseRequest.number);
            expect(response.body).toHaveProperty("credits");
            expect(response.body).toHaveProperty("description");
        });

        // Not found case
        it("should return 404 status and error message when course is not found", async () => {
            const courseRequest = {
                code: "CS999",
                number: 999,
            };

            const response = await request("http://localhost:8000")
                .post("/courses/get")
                .send(courseRequest)
                .expect("Content-Type", /json/)
                .expect(404);

            expect(response.body).toHaveProperty("error", "Course not found");
        });

        // Bad request, missing fields
        it("should return 400 status and error message when code or number is missing", async () => {
            const response = await request("http://localhost:8000")
                .post("/courses/get")
                .send({
                    code: "CS101", // missing number field
                })
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty("error", "Code and number are required");
        });
    });

    // Test for removing a course
    describe("POST /courses/remove", () => {
        it("should return a success message when course is removed successfully", async () => {
            const courseRequest = {
                code: "CS101",
                number: 1,
            };

            const response = await request("http://localhost:8000")
                .post("/courses/remove")
                .send(courseRequest)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Course removed successfully");
        });

        // Not found case for removal
        it("should return 404 status and error message when course to remove does not exist", async () => {
            const courseRequest = {
                code: "CS999",
                number: 999,
            };

            const response = await request("http://localhost:8000")
                .post("/courses/remove")
                .send(courseRequest)
                .expect("Content-Type", /json/)
                .expect(404);

            expect(response.body).toHaveProperty("error", "Course not found");
        });

        // Bad request, missing fields
        it("should return 400 status and error message when code or number is missing", async () => {
            const response = await request("http://localhost:8000")
                .post("/courses/remove")
                .send({
                    code: "CS101", // missing number field
                })
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty("error", "Code and number are required");
        });
    });

});
