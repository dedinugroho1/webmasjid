import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const MOCK_BUNNY_PORT = Number(process.env.MOCK_BUNNY_PORT ?? 4010);
const MOCK_BUNNY_ENV = { BUNNY_STORAGE_ZONE: "webmasjid-test", BUNNY_STORAGE_PASSWORD: "kunci-tes", MAILKETING_API_TOKEN: "token-tes" };

/**
 * Tes end-to-end. Prasyarat: database sudah dimigrasi & di-seed
 * (`npm run db:migrate && npm run db:seed`) dan aplikasi sudah di-build.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      // Bunny Storage tiruan: tes memakai jalur unggah sungguhan tanpa kredensial.
      command: "node tests/e2e/mock-bunny.mjs",
      url: `http://localhost:${MOCK_BUNNY_PORT}/__files`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_BUNNY_PORT: String(MOCK_BUNNY_PORT), ...MOCK_BUNNY_ENV },
    },
    {
      command: `npm run start -- -p ${PORT}`,
      url: `http://localhost:${PORT}/masuk`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...MOCK_BUNNY_ENV,
        BUNNY_STORAGE_ENDPOINT: `http://localhost:${MOCK_BUNNY_PORT}`,
        BUNNY_CDN_URL: `http://localhost:${MOCK_BUNNY_PORT}/cdn`,
        // Mailketing tiruan di server yang sama.
        MAILKETING_ENDPOINT: `http://localhost:${MOCK_BUNNY_PORT}/mailketing/api/v2/send`,
        EMAIL_FROM: "WebMasjid Uji <noreply@webmasjid.test>",
        ADMIN_NOTIFY_EMAIL: "platform@webmasjid.test",
      },
    },
  ],
});
