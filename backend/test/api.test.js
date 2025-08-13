// test/api.test.js
const request = require("supertest");
const app = require("../index"); // index.js must export `app`

describe("API tests", () => {
  test("POST /api/validate should return 400 on invalid PAN", async () => {
    const res = await request(app)
      .post("/api/validate")
      .send({ pan: "ABC123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0]).toMatch(/invalid/i);
  });
});
