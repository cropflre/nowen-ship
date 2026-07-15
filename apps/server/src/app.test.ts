import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://nowen:nowen_local_dev@localhost:5432/nowen_release_hub";
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "not-a-secret";
process.env.API_TOKEN = process.env.API_TOKEN ?? "not-a-secret";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "error";

test("GET /api/health/live returns a liveness payload", async () => {
  const { buildApp } = await import("./app.js");
  const app = await buildApp();

  const response = await app.inject({
    method: "GET",
    url: "/api/health/live",
  });
  const payload = response.json<{
    status: string;
    service: string;
    timestamp: string;
  }>();

  assert.equal(response.statusCode, 200);
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "nowen-ship-server");
  assert.equal(Number.isNaN(Date.parse(payload.timestamp)), false);

  await app.close();
});
