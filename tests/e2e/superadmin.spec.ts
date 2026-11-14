import { DEMO, expect, login, registerMasjid, test, uniq } from "./helpers";

const SUPER = { email: "superadmin@webmasjid.test", password: DEMO.password };

test("admin masjid biasa tidak bisa membuka /superadmin", async ({ page }) => {
  await login(page);
  await page.goto("/superadmin");
  await expect(page).toHaveURL(/error=forbidden/);
});

test("superadmin: tangguhkan, pulihkan, sembunyikan & ubah slug", async ({ page, browser }) => {
  // Masjid "palsu" didaftarkan di konteks terpisah.
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.202.0.3" } });
  const owner = await ctx.newPage();
  const fake = await registerMasjid(owner);

  await page.goto("/masuk");
  await page.fill("#email", SUPER.email);
  await page.fill("#password", SUPER.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/superadmin");
  await expect(page.getByText("Total masjid")).toBeVisible();

  await page.fill("input[name=q]", fake.slug);
  await page.getByRole("button", { name: "Cari" }).click();
  const row = page.getByTestId(`tenant-${fake.slug}`);
  await expect(row).toBeVisible();

  // Tangguhkan → publik 404, hilang dari direktori, admin-nya ditolak.
  page.once("dialog", (d) => d.accept("Pendaftaran palsu"));
  await row.getByRole("button", { name: "Tangguhkan" }).click();
  await expect(row.getByText("Ditangguhkan")).toBeVisible();
  expect((await page.request.get(`/${fake.slug}`)).status()).toBe(404);
  await page.goto("/");
  await expect(page.locator(`a[href="/${fake.slug}"]`)).toHaveCount(0);
  await owner.goto(`/${fake.slug}/admin`);
  await expect(owner).toHaveURL(/error=suspended/);
  // Superadmin tetap bisa membuka dashboard masjid tersebut.
  await page.goto(`/${fake.slug}/admin`);
  await expect(page.getByRole("heading", { name: "Ringkasan" })).toBeVisible();

  // Pulihkan.
  await page.goto(`/superadmin?q=${fake.slug}`);
  await row.getByRole("button", { name: "Pulihkan" }).click();
  await expect(row.getByText("Publik")).toBeVisible();
  expect((await page.request.get(`/${fake.slug}`)).status()).toBe(200);

  // Sembunyikan dari direktori (halaman tetap bisa diakses).
  await row.getByRole("button", { name: "Sembunyikan" }).click();
  await expect(row.getByText("Tersembunyi")).toBeVisible();
  expect((await page.request.get(`/${fake.slug}`)).status()).toBe(200);

  // Ubah slug: slug cadangan ditolak, slug baru berlaku.
  await row.getByRole("button", { name: "Ubah slug" }).click();
  await row.getByRole("textbox").fill("admin");
  await row.getByRole("button", { name: "Simpan" }).click();
  await expect(row.getByText(/tidak valid atau dicadangkan/)).toBeVisible();
  const newSlug = uniq("baru");
  await row.getByRole("textbox").fill(newSlug);
  await row.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByTestId(`tenant-${newSlug}`)).toBeVisible();
  expect((await page.request.get(`/${newSlug}`)).status()).toBe(200);
  expect((await page.request.get(`/${fake.slug}`)).status()).toBe(404);
  await ctx.close();
});
