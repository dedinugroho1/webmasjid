import { expect, test } from "./helpers";

test("/api/health melaporkan aplikasi dan database sehat", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok", db: "ok" });
  expect(body.ms).toBeGreaterThanOrEqual(0);
});
