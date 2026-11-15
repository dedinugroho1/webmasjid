import { expect, test, uniq, waitForHumanPace } from "./helpers";

test("halaman Kebijakan Privasi dan Syarat & Ketentuan tampil dan saling terhubung", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Kebijakan Privasi" }).click();
  await expect(page).toHaveURL(/\/privasi$/);
  await expect(page.getByRole("heading", { level: 1, name: "Kebijakan Privasi" })).toBeVisible();
  await expect(page.getByText(/hash/).first()).toBeVisible();
  await expect(page.getByText("Hapus Masjid").first()).toBeVisible();

  await page.getByRole("link", { name: "Syarat", exact: true }).click();
  await expect(page).toHaveURL(/\/syarat$/);
  await expect(page.getByRole("heading", { level: 1, name: "Syarat & Ketentuan" })).toBeVisible();
  // Tanpa kontak dikonfigurasi, halaman memakai tautan GitHub Issues (bukan email fiktif).
  await expect(page.getByRole("link", { name: /Issues di GitHub/ })).toHaveAttribute("href", /\/issues$/);
});

test("tautan hukum juga ada di halaman publik masjid", async ({ page }) => {
  await page.goto("/al-ikhlas");
  await expect(page.getByRole("link", { name: "Kebijakan Privasi" })).toHaveAttribute("href", /\/privasi$/);
  await expect(page.getByRole("link", { name: "Syarat & Ketentuan" })).toHaveAttribute("href", /\/syarat$/);
});

test("daftar masjid wajib menyetujui syarat (juga dipaksa di server)", async ({ page }) => {
  await page.goto("/daftar");
  const openedAt = Date.now();
  await page.fill("#masjidName", "Masjid Persetujuan");
  await page.fill("#slug", uniq("setuju"));
  await page.fill("#adminName", "Pak Setuju");
  await page.fill("#email", `${uniq("setuju")}@example.test`);
  await page.fill("#password", "rahasia123");
  await waitForHumanPace(page, openedAt);

  // Browser menahan form bila kotak belum dicentang.
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page).toHaveURL(/\/daftar$/);

  // Dilewati di browser → tetap ditolak server.
  await page.evaluate(() => document.querySelector("input[name=consent]")?.removeAttribute("required"));
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText(/harus menyetujui/)).toBeVisible();
  await expect(page.locator("#masjidName")).toHaveValue("Masjid Persetujuan");
});

test("robots, sitemap, dan tautan syarat/privasi di domain utama", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/privasi</loc>");
  expect(sitemap).toContain("/syarat</loc>");
  expect((await request.get("/robots.txt")).status()).toBe(200);
});
