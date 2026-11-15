import { expect, registerMasjid, test } from "./helpers";

test("catat pemasukan & pengeluaran, saldo, PDF, hapus", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/kas`);

  await page.fill("#amount", "1500000");
  await page.fill("#description", "Kotak Jumat uji");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

  await page.getByRole("button", { name: "Pengeluaran", exact: true }).click();
  await page.fill("#amount", "250000");
  await page.fill("#description", "Token listrik uji");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByRole("cell", { name: /Token listrik uji/ })).toBeVisible();

  // Saldo kas operasional = 1.500.000 − 250.000
  await expect(page.getByText(/Rp\s?1\.250\.000/).first()).toBeVisible();

  // Tampil transparan di halaman publik.
  await page.goto(`/${slug}`);
  await expect(page.getByText("Kotak Jumat uji")).toBeVisible();

  const pdf = await page.request.get(`/${slug}/admin/kas/laporan`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.goto(`/${slug}/admin/kas`);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("row", { name: /Token listrik uji/ }).getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("cell", { name: /Token listrik uji/ })).toHaveCount(0);
});

test("nominal nol ditolak", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/kas`);
  await page.fill("#amount", "0");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Nominal harus lebih dari 0")).toBeVisible();
});

test("ekspor buku kas ke CSV (Excel)", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/kas`);
  await page.fill("#amount", "750000");
  await page.fill("#description", "Infaq; dengan titik koma");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Excel" }).click()]);
  expect(download.suggestedFilename()).toMatch(new RegExp(`^kas-${slug}-\\d{4}-\\d{2}\\.csv$`));
  const csv = (await (await download.createReadStream()).toArray()).join("");
  expect(csv.startsWith("﻿")).toBe(true);
  expect(csv).toContain("Tanggal;Jenis;Kas;Kategori;Keterangan;Pemasukan;Pengeluaran");
  expect(csv).toContain('Pemasukan;Kas Operasional;Infaq Jumat;"Infaq; dengan titik koma";750000;');
  expect(csv).toContain("Kas Operasional;0;750000;0;750000");

  const semua = await page.request.get(`/${slug}/admin/kas/ekspor?bulan=semua`);
  expect(semua.status()).toBe(200);
  expect(await semua.text()).toContain("Semua transaksi");
  // Masjid lain tidak boleh mengekspor.
  expect((await page.request.get("/al-ikhlas/admin/kas/ekspor")).status()).toBe(403);
});
