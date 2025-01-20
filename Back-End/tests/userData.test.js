const request = require("supertest");

const url = process.DOCKER_URL || "host.docker.internal:8000";

describe("POST /userdata", () => {
    it("should return user data for ID 1", async () => {
        const response = await request(url)
            .post("/data/userdata")
            .send({ id: "1" }) // Sending the valid ID
            .expect(200);

        // Validate response structure and contents
        expect(response.body).toHaveProperty("timeline");
        expect(response.body.timeline).toBeInstanceOf(Array);
        expect(response.body.timeline[0]).toHaveProperty("season");
        expect(response.body.timeline[0]).toHaveProperty("year");
        expect(response.body.timeline[0]).toHaveProperty("coursecode");

        expect(response.body).toHaveProperty("deficiencies");
        expect(response.body.deficiencies).toBeInstanceOf(Array);
        expect(response.body.deficiencies[0]).toHaveProperty("coursepool");
        expect(response.body.deficiencies[0]).toHaveProperty("creditsRequired");

        expect(response.body).toHaveProperty("exemptions");
        expect(response.body.exemptions).toBeInstanceOf(Array);
        expect(response.body.exemptions[0]).toHaveProperty("coursecode");

        expect(response.body).toHaveProperty("degree");
        expect(response.body.degree).toHaveProperty("id");
        expect(response.body.degree).toHaveProperty("name");
        expect(response.body.degree).toHaveProperty("totalCredits");
    });

    it("should return error if no user ID is provided", async () => {
        const response = await request(url)
            .post("/data/userdata")
            .send({}) // Sending an empty request without ID
            .expect("Content-Type", /json/)
            .expect(400);

        expect(response.body).toHaveProperty("message", "User ID is required");
    });

    it("should return error for wrong user id", async () => {
        // Simulate an unexpected error in the handler
        const response = await request(url)
            .post("/data/userdata")
            .send({ id: "10543" })
            .expect("Content-Type", /json/)
            .expect(404);

        expect(response.body).toHaveProperty("message", "User not found");
    });
});
