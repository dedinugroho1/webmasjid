import { DEMO, expect, login, registerMasjid, test } from "./helpers";

test("admin tanpa login diarahkan ke /masuk", async ({ page }) => {
  await page.goto(`/${DEMO.slug}/admin/kas`);
  await expect(page).toHaveURL(/\/masuk\?next=/);
});

test("login demo masuk ke dashboard masjidnya", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(new RegExp(`/${DEMO.slug}/admin$`));
  await expect(page.getByRole("heading", { name: "Ringkasan" })).toBeVisible();
});

test("password salah ditolak", async ({ page }) => {
  await page.goto("/masuk");
  await page.fill("#email", DEMO.email);
  await page.fill("#password", "salah-sekali");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText("Email atau password salah.")).toBeVisible();
});

test("daftar masjid baru & isolasi antar-tenant", async ({ page, request }) => {
  await registerMasjid(page);
  await expect(page.getByText(/Ahlan wa sahlan/)).toBeVisible();

  // Admin masjid baru tidak boleh membuka admin Al-Ikhlas.
  await page.goto(`/${DEMO.slug}/admin/kas`);
  await expect(page).toHaveURL(/error=forbidden/);
  const pdf = await page.request.get(`/${DEMO.slug}/admin/kas/laporan`);
  expect(pdf.status()).toBe(403);
  // Tanpa sesi sama sekali.
  expect((await request.get(`/${DEMO.slug}/admin/kas/laporan`, { maxRedirects: 0 })).status()).toBeGreaterThanOrEqual(300);
});

test("slug cadangan ditolak", async ({ page }) => {
  await page.goto("/daftar");
  await page.fill("#masjidName", "Masjid X");
  await page.fill("#slug", "admin");
  await page.fill("#adminName", "X");
  await page.fill("#email", "x-reserved@example.test");
  await page.fill("#password", "rahasia123");
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText(/dicadangkan/)).toBeVisible();
});

test("honeypot menolak bot", async ({ page }) => {
  await page.goto("/daftar");
  await page.fill("#masjidName", "Masjid Bot");
  await page.fill("#adminName", "Bot");
  await page.fill("#email", "bot@example.test");
  await page.fill("#password", "botbotbot1");
  await page.evaluate(() => ((document.querySelector("input[name=website]") as HTMLInputElement).value = "spam"));
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText("Pendaftaran gagal. Silakan coba lagi.")).toBeVisible();
});
