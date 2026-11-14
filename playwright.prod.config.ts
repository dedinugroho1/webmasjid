import { defineConfig, devices } from "@playwright/test";

/**
 * Tes asap (smoke test) menyeluruh terhadap deployment sungguhan.
 *
 *   PROD_URL=https://web-masjid-rose.vercel.app npm run test:prod
 *
 * Membuat SATU masjid uji (slug "prod-uji-…"), menguji semua fitur, lalu
 * menghapus semua data uji (butuh DATABASE_URL production di .env.local).
 */
const PROD_URL = process.env.PROD_URL;
if (!PROD_URL) throw new Error("Set PROD_URL, mis. PROD_URL=https://web-masjid-rose.vercel.app");

export default defineConfig({
  testDir: "tests/prod",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalTeardown: "./tests/prod/teardown.ts",
  use: { baseURL: PROD_URL, trace: "off", ...devices["Desktop Chrome"], navigationTimeout: 30_000, actionTimeout: 20_000 },
});
