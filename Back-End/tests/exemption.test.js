jest.mock("../dist/controllers/exemptionController/exemptionController", () => ({
  __esModule: true,
  default: {
    createExemption                       : jest.fn(),
    getAllExemptionsByUser                : jest.fn(),
    deleteExemptionByCoursecodeAndUserId  : jest.fn()
  }
}));

const request     = require("supertest");
const express     = require("express");
const router      = require("../dist/routes/exemption").default;
const controller  = require("../dist/controllers/exemptionController/exemptionController").default;

const url = process.DOCKER_URL || "host.docker.internal:8000";

const app = express();
app.use(express.json());
app.use("/exemption", router);

describe("Exemption Routes", () => {
    const newExemption = {
      id: "4",
      coursecode: "COMP335",
      user_id: "1",
    };
    // Test for adding an exemption
    describe("POST /exemption/create", () => {
        it("should return a success message and exemption data", async () => {

            controller.createExemption.mockResolvedValue(newExemption);

            const response = await request(app)
                .post("/exemption/create")
                .send(newExemption)
                .expect("Content-Type", /json/)
                .expect(201);

            expect(response.body).toHaveProperty
            ("message", "Exemption created successfully.");
            expect(response.body).toHaveProperty("exemption");
            const exemption = response.body.exemption;

            // Validate the properties of the returned exemption
            expect(exemption).toMatchObject({
                id: "4",
                coursecode: "COMP335",
                user_id: "1",
            });

        });

        // Bad request, missing fields
        it("should return 400 status and error message when user_id is missing", async () => {
            const response = await request(url)
                .post("/exemption/create")
                .send({
                    id: "2",
                    coursecode: "COMP335"
                }) // Missing user_id
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty
                ("error", "Invalid input. Please provide an array of course codes and a user_id as a string.");
        });
    });

    // Test for getting all exemptions by user_id
    describe("POST /exemption/getAll", () => {
        it("should return exemptions related a specific user", async () => {
            const exemptionRequest = {
                user_id: "1"
            };

            controller.getAllExemptionsByUser.mockResolvedValue(newExemption);

            const response = await request(app)
                .post("/exemption/getAll")
                .send(exemptionRequest)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("exemption", newExemption);
        });

        // No user_id provided case
        it("should return 400 status and error message when user_id is not provided", async () => {
            const response = await request(url)
                .post("/exemption/getAll")
                .send(
                    // Empty request body
                )
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty("error", "Invalid input. Please provide user_id as a string.");
        });
    });

    // Test for deleting an exemption
    describe("POST /exemption/delete", () => {
        it("should return a success message when exemption is removed successfully", async () => {
            const exemptionRequest = {
                coursecode: "COMP335",
                user_id: "1"
            };

            const response = await request(app)
                .post("/exemption/delete")
                .send(exemptionRequest)
                .expect("Content-Type", /json/)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Exemption deleted successfully.");
        });


        // Bad request, missing fields
        it("should return 400 status and error message when request body is missing", async () => {
            const response = await request(url)
                .post("/exemption/delete")
                .send({ // missing coursecode and user_id field
                })
                .expect("Content-Type", /json/)
                .expect(400);

            expect(response.body).toHaveProperty
            ("error", "Invalid input. Please provide coursecode and user_id as strings.");
        });
    });

});
