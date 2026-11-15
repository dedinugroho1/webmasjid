import { PNG, tenantFiles, tenantIdOf } from "./bunny-helpers";
import { DEMO, expect, login, registerMasjid, test, uniq } from "./helpers";

test("hapus masjid: konfirmasi wajib, semua data, akun pengurus, dan foto ikut terhapus", async ({ page, browser }) => {
  const admin = await registerMasjid(page);
  const { slug } = admin;
  const tenantId = await tenantIdOf(page);

  // Isi data: transaksi, foto galeri (masuk ke Bunny tiruan), dan seorang bendahara.
  await page.goto(`/${slug}/admin/kas`);
  await page.fill("#amount", "100000");
  await page.fill("#description", "Data yang akan dihapus");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

  await page.goto(`/${slug}/admin/galeri`);
  await page.setInputFiles("#image", { name: "foto.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Unggah Foto" }).click();
  await expect(page.getByText("Foto ditambahkan ke galeri.")).toBeVisible();
  expect(await tenantFiles(page, tenantId)).toHaveLength(1);

  await page.goto(`/${slug}/admin/pengurus`);
  await page.getByRole("button", { name: "Buat Link" }).click();
  const inviteUrl = new URL((await page.locator("code").textContent())!.trim()).pathname;
  const bctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.203.0.5" } });
  const bend = await bctx.newPage();
  const bendEmail = `${uniq("bend")}@example.test`;
  await bend.goto(inviteUrl);
  await bend.fill("#name", "Bendahara Uji");
  await bend.fill("#email", bendEmail);
  await bend.fill("#password", "bendahara123");
  await bend.check("input[name=consent]");
  await bend.getByRole("button", { name: /Buat Akun/ }).click();
  await bend.waitForURL(`**/${slug}/admin`);

  // Konfirmasi yang salah ditolak; masjid tetap ada.
  await page.goto(`/${slug}/admin/pengaturan`);
  page.on("dialog", (d) => d.accept());
  await page.getByLabel(/Ketik/).fill("salah-ketik");
  await page.getByRole("button", { name: "Hapus Masjid Permanen" }).click();
  await expect(page.getByText(/Ketik persis/)).toBeVisible();
  expect((await page.request.get(`/${slug}`)).status()).toBe(200);

  // Konfirmasi benar → terhapus, diarahkan ke halaman masuk.
  await page.getByLabel(/Ketik/).fill(slug);
  await page.getByRole("button", { name: "Hapus Masjid Permanen" }).click();
  await page.waitForURL(/\/masuk\?dihapus=1/);
  await expect(page.getByText(/telah dihapus permanen/)).toBeVisible();

  // Halaman publik hilang, kedua akun tidak bisa masuk lagi, foto di Bunny terhapus.
  expect((await page.request.get(`/${slug}`)).status()).toBe(404);
  for (const [who, email, password] of [
    ["admin", admin.email, admin.password],
    ["bendahara", bendEmail, "bendahara123"],
  ] as const) {
    await page.goto("/masuk");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByText("Email atau password salah."), `${who} masih bisa masuk`).toBeVisible();
  }
  expect(await tenantFiles(page, tenantId)).toEqual([]);
  await bctx.close();
});

test("masjid demo tidak menawarkan penghapusan", async ({ page }) => {
  await login(page);
  await page.goto(`/${DEMO.slug}/admin/pengaturan`);
  await expect(page.getByRole("heading", { name: "Pengaturan Masjid" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hapus Masjid Permanen" })).toHaveCount(0);
});
