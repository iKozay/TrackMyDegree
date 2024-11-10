const request = require("supertest");

describe("POST /auth/signup", () => {
	it("should return a successful signup message and user details", async () => {
		const response = await request("http://localhost:8000")
			.post("/auth/signup")
			.send({
				email: "example@example.com",
				password: "pass",
				fullname: "Random User",
				type: "student",
			})
			.expect("Content-Type", /json/)
			.expect(201);

		expect(response.body).toHaveProperty("id"); // Ensure that the 'id' property is present
		expect(typeof response.body.id).toBe("string"); // Ensure that 'id' is a string

		// Check if the 'id' matches a UUID format
		expect(response.body.id).toMatch(
			/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
		);
	});

	// Invalid request, missing fields
	it("should return a 500 error message", async () => {
		const response = await request("http://localhost:8000")
			.post("/auth/signup")
			.send({
				email: "example@example.com",
				password: "pass",
				fullname: "Random User",
			})
			.expect("Content-Type", /json/)
			.expect(500);

		expect(response.body).toHaveProperty(
			"error",
			"Internal server error in /signup"
		);
	});
});
