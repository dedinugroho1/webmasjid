import { DEMO, expect, test } from "./helpers";

test("login diblokir setelah terlalu banyak percobaan", async ({ page }) => {
  const email = `kunci-${Date.now()}@example.test`;
  for (let i = 0; i < 8; i++) {
    await page.goto("/masuk");
    await page.fill("#email", email);
    await page.fill("#password", `salah-${i}`);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByText("Email atau password salah.")).toBeVisible();
  }
  await page.goto("/masuk");
  await page.fill("#email", email);
  await page.fill("#password", "salah-lagi");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText(/Terlalu banyak percobaan/)).toBeVisible();
});

test("API Better Auth membalas 429 setelah batas", async ({ request }) => {
  const origin = `http://localhost:${process.env.E2E_PORT ?? 3100}`;
  const headers = { origin, "x-forwarded-for": `10.250.${Date.now() % 250}.7` };
  const codes: number[] = [];
  for (let i = 0; i < 12; i++) {
    const res = await request.post("/api/auth/sign-in/email", {
      headers,
      data: { email: DEMO.email, password: "salah-sekali" },
    });
    codes.push(res.status());
  }
  expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(2);
});
