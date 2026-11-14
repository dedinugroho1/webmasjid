import { expect, registerMasjid, test } from "./helpers";

test("petugas Jumat: isi, tampil di website & ringkasan, kosongkan menghapus", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/jumat`);
  const rows = page.locator("form[aria-label^='Petugas Jumat']");
  await expect(rows).toHaveCount(8);

  const first = rows.first();
  await first.getByLabel("Khatib").fill("Ust. Uji Khatib");
  await first.getByLabel("Imam").fill("Ust. Uji Imam");
  await first.getByLabel("Muadzin").fill("Sdr. Uji");
  await first.getByRole("button", { name: "Simpan" }).click();
  await expect(first.getByRole("button", { name: "Tersimpan" })).toBeVisible();

  const second = rows.nth(1);
  await second.getByLabel("Khatib").fill("Ust. Pekan Depan");
  await second.getByRole("button", { name: "Simpan" }).click();
  await expect(second.getByRole("button", { name: "Tersimpan" })).toBeVisible();

  await page.goto(`/${slug}`);
  const card = page.locator("section[aria-labelledby=jumat]");
  await expect(card).toContainText("Ust. Uji Khatib");
  await expect(card).toContainText("Ust. Uji Imam");
  await expect(card).toContainText("Ust. Pekan Depan");

  await page.goto(`/${slug}/admin`);
  await expect(page.getByText("Ust. Uji Khatib")).toBeVisible();

  // Kosongkan semua kolom → jadwal terhapus.
  await page.goto(`/${slug}/admin/jumat`);
  for (const f of ["Khatib", "Imam", "Muadzin"]) await rows.first().getByLabel(f).fill("");
  await rows.first().getByRole("button", { name: "Simpan" }).click();
  await expect(rows.first().getByRole("button", { name: "Tersimpan" })).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.locator("section[aria-labelledby=jumat]")).toContainText("Petugas belum diumumkan");
});

test("kajian rutin: tambah, tampil di website, diliburkan, diedit", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/kajian`);
  await page.selectOption("#dayOfWeek", "3");
  await page.fill("#time", "Ba'da Maghrib");
  await page.fill("#title", "Kitab Bulughul Maram");
  await page.fill("#ustadz", "Ust. Uji Kajian");
  await page.selectOption("#frequency", "PEKAN_1_3");
  await page.getByRole("button", { name: "Tambah Kajian Rutin" }).click();
  await expect(page.getByText("Kajian rutin tersimpan.")).toBeVisible();
  await expect(page.getByText("Rabu, Ba'da Maghrib")).toBeVisible();

  await page.goto(`/${slug}`);
  const section = page.locator("section[aria-labelledby=kajian]");
  await expect(section).toContainText("Kitab Bulughul Maram");
  await expect(section).toContainText("Pekan ke-1 & ke-3");

  await page.goto(`/${slug}/admin/kajian`);
  await page.getByRole("button", { name: "Liburkan" }).click();
  await expect(page.getByText("Libur", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aktifkan" })).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.locator("section[aria-labelledby=kajian]")).not.toContainText("Bulughul Maram");

  await page.goto(`/${slug}/admin/kajian`);
  await page.getByRole("button", { name: "Aktifkan" }).click();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/kajian\/[^/]+$/);
  await page.fill("#title", "Kitab Bulughul Maram (lanjutan)");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(`**/${slug}/admin/kajian`);
  await expect(page.getByText("Kitab Bulughul Maram (lanjutan)")).toBeVisible();
});

test("catat infaq Jumat cepat → laporan kas Jumat & cetak papan info", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin`);
  await page.getByRole("link", { name: "Catat Infaq Jumat" }).click();
  await page.waitForURL(/catat=infaq-jumat/);
  await expect(page.locator("#category")).toHaveValue("Infaq Jumat");
  const friday = await page.locator("#transactionDate").inputValue();
  expect(new Date(`${friday}T00:00:00Z`).getUTCDay()).toBe(5);
  await page.fill("#amount", "1750000");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

  await page.goto(`/${slug}/admin/kas/jumat`);
  const text = page.locator("pre");
  await expect(text).toContainText(`LAPORAN KAS MASJID ${slug.toUpperCase()}`);
  await expect(text).toContainText("Infaq Jumat: Rp 1.750.000");
  await expect(text).toContainText("Saldo saat ini: Rp 1.750.000");
  await expect(page.getByRole("link", { name: "Kirim ke WhatsApp" })).toHaveAttribute("href", /wa\.me/);

  // Website publik menampilkan laporan Jumat terakhir.
  await page.goto(`/${slug}`);
  await expect(page.getByText("di antaranya Infaq Jumat")).toBeVisible();

  await page.goto(`/${slug}/admin/cetak`);
  await expect(page.getByText("Petugas Sholat Jumat")).toBeVisible();
  await expect(page.getByText(/Jadwal Sholat/).first()).toBeVisible();
  // Pilih hanya bagian kas.
  for (const label of ["Petugas Jumat", "Kajian Rutin", "Jadwal Sholat"]) await page.getByLabel(label).uncheck();
  await page.getByRole("button", { name: "Terapkan" }).click();
  await expect(page.getByText("Petugas Sholat Jumat")).toHaveCount(0);
  await expect(page.getByText(/Saldo Kas per/)).toBeVisible();
});
