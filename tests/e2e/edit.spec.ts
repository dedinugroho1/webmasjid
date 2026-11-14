import { DEMO, expect, login, registerMasjid, test } from "./helpers";

test("edit transaksi: ubah jenis, nominal & tanggal; tidak bisa lintas masjid", async ({ page, browser }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/kas`);
  await page.fill("#amount", "100000");
  await page.fill("#description", "Salah input");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByRole("cell", { name: /Salah input/ })).toBeVisible();

  await page.getByRole("row", { name: /Salah input/ }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(new RegExp(`/${slug}/admin/kas/[^/?]+$`));
  const editPath = new URL(page.url()).pathname;
  const txId = editPath.split("/").pop()!;
  await expect(page.locator("#amount")).toHaveValue("100.000");

  await page.getByRole("button", { name: "Pengeluaran", exact: true }).click();
  await page.fill("#amount", "75000");
  await page.fill("#description", "Perbaikan keran");
  await page.fill("#transactionDate", "2026-10-03");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(`**/${slug}/admin/kas?bulan=2026-10`);
  const row = page.getByRole("row", { name: /Perbaikan keran/ });
  await expect(row).toContainText("75.000");
  await expect(row).toContainText("−");

  // Admin masjid lain tidak bisa membuka transaksi ini via URL masjidnya sendiri.
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.201.0.9" } });
  const other = await ctx.newPage();
  await login(other);
  const res = await other.goto(`/${DEMO.slug}/admin/kas/${txId}`);
  expect(res?.status()).toBe(404);
  await ctx.close();
});

test("edit agenda: waktu & petugas tersimpan, kolom dikosongkan jadi kosong", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/agenda`);
  await page.fill("#dateTime", "2026-12-04T11:45");
  await page.selectOption("#type", "JUMAT");
  await page.fill("#title", "Jumat Awal");
  await page.fill("#speaker", "Ust. A");
  await page.fill("#location", "Ruang utama");
  await page.getByRole("button", { name: "Simpan Agenda" }).click();
  await expect(page.getByText("Agenda tersimpan.")).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "Jumat Awal" }).getByRole("link", { name: "Edit" }).click();
  await expect(page.locator("#dateTime")).toHaveValue("2026-12-04T11:45");
  await page.fill("#title", "Jumat Diperbarui");
  await page.fill("#imam", "Ust. B");
  await page.fill("#location", "");
  await page.fill("#dateTime", "2026-12-11T11:50");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(`**/${slug}/admin/agenda`);

  const item = page.getByRole("listitem").filter({ hasText: "Jumat Diperbarui" });
  await expect(item).toContainText("11 Desember 2026");
  await expect(item).toContainText("11:50");
  await expect(item).toContainText("Imam: Ust. B");
  await expect(item).not.toContainText("Ruang utama");
});
