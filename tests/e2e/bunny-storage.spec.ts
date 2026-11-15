import { MOCK, PNG, tenantFiles, tenantIdOf } from "./bunny-helpers";
import { expect, registerMasjid, test } from "./helpers";

test("foto galeri: tersimpan di Bunny, tampil lewat CDN, terhapus bersama itemnya", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  const tenantId = await tenantIdOf(page);
  expect(await tenantFiles(page, tenantId)).toEqual([]);

  await page.goto(`/${slug}/admin/galeri`);
  await page.setInputFiles("#image", { name: "kegiatan.png", mimeType: "image/png", buffer: PNG });
  await page.fill("#caption", "Santunan yatim");
  await page.getByRole("button", { name: "Unggah Foto" }).click();
  await expect(page.getByText("Foto ditambahkan ke galeri.")).toBeVisible();

  const [file] = await tenantFiles(page, tenantId);
  // Foto dikompresi di browser → bisa berubah menjadi JPEG.
  expect(file).toMatch(new RegExp(`^${tenantId}/gallery/[0-9a-f-]{36}\\.(png|jpg)$`));

  // Halaman publik memakai URL CDN (bukan data URL) dan gambarnya bisa dimuat.
  await page.goto(`/${slug}`);
  const src = await page.locator("section[aria-labelledby=galeri] img").first().getAttribute("src");
  expect(src).toBe(`${MOCK}/cdn/${file}`);
  const served = await page.request.get(src!);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe(file.endsWith(".jpg") ? "image/jpeg" : "image/png");
  expect((await served.body()).length).toBeGreaterThan(0);

  // Hapus item → file ikut terhapus dari penyimpanan.
  await page.goto(`/${slug}/admin/galeri`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("listitem").filter({ hasText: "Santunan yatim" }).getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByText("Belum ada foto.")).toBeVisible();
  expect(await tenantFiles(page, tenantId)).toEqual([]);
  expect((await page.request.get(`${MOCK}/cdn/${file}`)).status()).toBe(404);
});

test("logo: diganti → file lama dihapus; dicentang hapus → file terhapus", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  const tenantId = await tenantIdOf(page);

  const save = async () => {
    await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
    await expect(page.getByText("Pengaturan tersimpan.")).toBeVisible();
  };

  await page.goto(`/${slug}/admin/pengaturan`);
  await page.setInputFiles("#logo", { name: "logo1.png", mimeType: "image/png", buffer: PNG });
  await save();
  const [first] = await tenantFiles(page, tenantId);
  expect(first).toContain("/logo/");

  await page.reload();
  await page.setInputFiles("#logo", { name: "logo2.png", mimeType: "image/png", buffer: PNG });
  await save();
  const afterReplace = await tenantFiles(page, tenantId);
  expect(afterReplace).toHaveLength(1);
  expect(afterReplace[0]).not.toBe(first);

  await page.reload();
  await page.locator("input[name=remove_logo]").check();
  await save();
  expect(await tenantFiles(page, tenantId)).toEqual([]);
});

test("bukti transaksi: tersimpan di Bunny dan terhapus saat transaksi dihapus", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  const tenantId = await tenantIdOf(page);

  await page.goto(`/${slug}/admin/kas`);
  await page.fill("#amount", "50000");
  await page.fill("#description", "Nota bukti uji");
  await page.setInputFiles("#receipt", { name: "nota.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();
  const [receipt] = await tenantFiles(page, tenantId);
  expect(receipt).toContain("/receipts/");
  await expect(page.getByRole("link", { name: "Bukti" })).toHaveAttribute("href", `${MOCK}/cdn/${receipt}`);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("row", { name: /Nota bukti uji/ }).getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("cell", { name: /Nota bukti uji/ })).toHaveCount(0);
  expect(await tenantFiles(page, tenantId)).toEqual([]);
});

test("pengaturan gagal validasi: unggahan baru tidak tertinggal sebagai file yatim", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  const tenantId = await tenantIdOf(page);
  await page.goto(`/${slug}/admin/pengaturan`);
  await page.setInputFiles("#logo", { name: "logo.png", mimeType: "image/png", buffer: PNG });
  await page.fill("#customDomain", "palsu.localhost"); // domain platform → ditolak setelah unggah
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByText("Domain ini milik platform")).toBeVisible();
  expect(await tenantFiles(page, tenantId)).toEqual([]);
});
