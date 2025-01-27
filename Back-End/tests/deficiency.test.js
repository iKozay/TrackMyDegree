jest.mock("../dist/controllers/deficiencyController/deficiencyController", () => ({
  __esModule: true,
  default: {
    createDeficiency                      : jest.fn(),
    getAllDeficienciesByUser              : jest.fn(),
    deleteDeficiencyByCoursepoolAndUserId : jest.fn()
  }
}));

const request     = require("supertest");
const express     = require("express");
const router      = require("../dist/routes/deficiency").default;
const controller  = require("../dist/controllers/deficiencyController/deficiencyController").default;

const url = process.DOCKER_URL || "host.docker.internal:8000";

const app = express();
app.use(express.json());
app.use("/deficiency", router);

describe("Deficiency Routes", () => {
    // Test for adding an deficiency
    describe("POST /deficiency/create", () => {
        it("should return a success message and deficiency data", async () => {

            // const newUser = {
            //     email: "test1@test.com",
            //     password: "pass",
            //     fullname: "Random User",
            //     type: "student",
            //     degree: "CS"
            // };

            // const signupResponse = await request(url)
            //     .post("/auth/signup")
            //     .send(newUser)
            //     .expect("Content-Type", /json/)
            //     .expect(201);

            // const user_id = signupResponse.body.id;

            const newDeficiency = {
                coursepool: "1",
                user_id: "1",
                creditsRequired: 120,
            };

            controller.createDeficiency.mockResolvedValue({ 
              id: "random id",
              ...newDeficiency
             });

            const response = await request(app)
                .post("/deficiency/create")
                .send(newDeficiency)
                .expect("Content-Type", /json/)
                .expect(201);

            expect(response.body).toHaveProperty("message", "Deficiency created successfully.");
            expect(response.body).toHaveProperty("deficiency");
            expect(response.body.deficiency).toHaveProperty("id", "random id");

        });

        // Bad request, missing fields
        it("should return 400 status and error message when user_id is missing", async () => {
            const response = await request(url)
                .post("/deficiency/create")
                .send({
                    coursepool: "1",
                    creditsRequired: 120
                }) // Missing user_id
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty("error", "Invalid input. Please provide coursepool, user_id, and creditsRequired in valid format.");
        });
    });

    // Test for getting all deficiencies by user_id
    describe("POST /deficiency/getAll", () => {
        it("should return deficiencies related a specific user", async () => {
            const deficiencyRequest = {
                user_id: "2"
            };

            const response = await request(url)
                .post("/deficiency/getAll")
                .send(deficiencyRequest)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Deficiency read successfully.");
            expect(response.body).toHaveProperty("deficiency");
        });

        // No user_id provided case
        it("should return 400 status and error message when user_id is not provided", async () => {
            const response = await request(url)
                .post("/deficiency/getAll")
                .send(
                    // Empty request body
                )
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty("error", "Invalid input. Please provide user_id as a string.");
        });
    });

    // Test for deleting an deficiency
    describe("POST /deficiency/delete", () => {
        it("should return a success message when deficiency is removed successfully", async () => {
            const deficiencyRequest = {
                coursepool: "1",
                user_id: "1",
                creditsRequired: 120
            };

            controller.deleteDeficiencyByCoursepoolAndUserId.mockResolvedValue("PASS");

            const response = await request(app)
                .post("/deficiency/delete")
                .send(deficiencyRequest)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Deficiency deleted successfully.");
        });


        // Bad request, missing fields
        it("should return 400 status and error message when request body is missing", async () => {
            const response = await request(url)
                .post("/deficiency/delete")
                .send({ // missing request body
                })
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty("error", "Invalid input. Please provide id as a string.");
        });
    });

});
