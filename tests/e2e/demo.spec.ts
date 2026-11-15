import { DEMO, expect, login, test } from "./helpers";

const DEMO_MSG = /Mode demo: perubahan tidak disimpan/;

test("masjid demo bisa dijelajahi tetapi tidak bisa diubah", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Mode demo", { exact: true })).toBeVisible();

  // Simpan transaksi → ditolak, data tidak bertambah.
  await page.goto(`/${DEMO.slug}/admin/kas`);
  const rows = await page.getByRole("row").count();
  await page.fill("#amount", "5000");
  await page.fill("#description", "Coba vandal demo");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText(DEMO_MSG)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row")).toHaveCount(rows);
  await expect(page.getByText("Coba vandal demo")).toHaveCount(0);

  // Pengaturan → ditolak.
  await page.goto(`/${DEMO.slug}/admin/pengaturan`);
  await page.fill("#name", "Masjid Diubah Orang");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByText(DEMO_MSG)).toBeVisible();
  await page.goto(`/${DEMO.slug}`);
  await expect(page.getByRole("heading", { name: "Masjid Al-Ikhlas" })).toBeVisible();
});

test("password akun demo tidak bisa diganti (form & API)", async ({ page }) => {
  await login(page);
  await page.goto(`/${DEMO.slug}/admin/akun`);
  await page.fill("#currentPassword", DEMO.password);
  await page.fill("#newPassword", "dibajak-123");
  await page.fill("#confirmPassword", "dibajak-123");
  await page.getByRole("button", { name: "Ganti Password" }).click();
  await expect(page.getByText(DEMO_MSG)).toBeVisible();

  const origin = new URL(page.url()).origin;
  const api = await page.request.post("/api/auth/change-password", {
    headers: { origin },
    data: { currentPassword: DEMO.password, newPassword: "dibajak-456" },
  });
  expect(api.status()).toBe(403);
  const rename = await page.request.post("/api/auth/update-user", { headers: { origin }, data: { name: "Nama Dibajak" } });
  expect(rename.status()).toBe(403);

  // Password lama tetap berlaku.
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL("**/masuk");
  await login(page);
});

test("tombol 'Coba Dashboard Demo' mengisi akun demo otomatis", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Coba Dashboard Demo" }).click();
  await page.waitForURL(/\/masuk\?demo=1/);
  await expect(page.locator("#email")).toHaveValue(DEMO.email);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(`**/${DEMO.slug}/admin`);
  await expect(page.getByText("Mode demo", { exact: true })).toBeVisible();
});
