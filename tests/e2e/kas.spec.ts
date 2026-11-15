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
