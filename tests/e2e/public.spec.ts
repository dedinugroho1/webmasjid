import { DEMO, expect, test } from "./helpers";

test("landing menampilkan direktori masjid", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Website masjid");
  await expect(page.locator(`a[href="/${DEMO.slug}"]`).first()).toBeVisible();
});

test("halaman publik masjid: jadwal, kas, infaq, agenda", async ({ page }) => {
  await page.goto(`/${DEMO.slug}`);
  await expect(page.getByRole("heading", { name: "Masjid Al-Ikhlas" })).toBeVisible();
  await expect(page.getByText("Kas Operasional").first()).toBeVisible();
  await expect(page.getByText("Subuh").first()).toBeVisible();
  await expect(page.getByText("Agenda Kegiatan")).toBeVisible();
  await expect(page.getByText("Sholat Jumat").first()).toBeVisible();
  await expect(page.getByText("Kajian Rutin").first()).toBeVisible();
  await expect(page.getByText("7123 4567 89")).toBeVisible();
});

test("slug tidak terdaftar → 404", async ({ page }) => {
  const res = await page.goto("/masjid-yang-tidak-ada");
  expect(res?.status()).toBe(404);
});

test("fitur TV dinonaktifkan", async ({ page }) => {
  const res = await page.goto(`/${DEMO.slug}/tv`);
  expect(res?.status()).toBe(404);
});
