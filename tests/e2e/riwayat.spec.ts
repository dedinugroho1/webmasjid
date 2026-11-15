import { expect, registerMasjid, test, uniq } from "./helpers";

test("riwayat perubahan: tambah, ubah, hapus tercatat dengan pelakunya; bendahara hanya melihat kas", async ({ page, browser }) => {
  const { slug } = await registerMasjid(page);

  // Admin menambah dan mengubah transaksi.
  await page.goto(`/${slug}/admin/kas`);
  await page.fill("#amount", "100000");
  await page.fill("#description", "Kotak amal uji");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByRole("cell", { name: /Kotak amal uji/ })).toBeVisible();

  await page.getByRole("row", { name: /Kotak amal uji/ }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/kas\/[^/?]+$/);
  await page.fill("#amount", "150000");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(/\/admin\/kas\?bulan=/);

  // Simpan tanpa mengubah apa pun → tidak menambah riwayat.
  await page.getByRole("row", { name: /Kotak amal uji/ }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/kas\/[^/?]+$/);
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(/\/admin\/kas\?bulan=/);

  // Undang bendahara; ia menghapus sebuah transaksi.
  await page.goto(`/${slug}/admin/pengurus`);
  await page.fill("#note", "Bu Bendahara");
  await page.getByRole("button", { name: "Buat Link" }).click();
  const invite = new URL((await page.locator("code").textContent())!.trim()).pathname;
  const bctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.204.0.7" } });
  const bend = await bctx.newPage();
  await bend.goto(invite);
  await bend.fill("#name", "Bu Bendahara Uji");
  await bend.fill("#email", `${uniq("bend")}@example.test`);
  await bend.fill("#password", "bendahara123");
  await bend.check("input[name=consent]");
  await bend.getByRole("button", { name: /Buat Akun/ }).click();
  await bend.waitForURL(`**/${slug}/admin`);

  await bend.goto(`/${slug}/admin/kas`);
  await bend.fill("#amount", "5000");
  await bend.fill("#description", "Salah catat bendahara");
  await bend.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(bend.getByRole("cell", { name: /Salah catat bendahara/ })).toBeVisible();
  bend.once("dialog", (d) => d.accept());
  await bend.getByRole("row", { name: /Salah catat bendahara/ }).getByRole("button", { name: "Hapus" }).click();
  await expect(bend.getByRole("cell", { name: /Salah catat bendahara/ })).toHaveCount(0);

  // Admin melihat riwayat lengkap.
  await page.goto(`/${slug}/admin/riwayat`);
  const list = page.getByTestId("audit-list");
  await expect(list).toContainText("Menambah pemasukan Rp 100.000 · Infaq Jumat (Kotak amal uji)");
  await expect(list).toContainText("nominal Rp 100.000 → Rp 150.000");
  await expect(list).toContainText("Menambah pemasukan Rp 5.000 · Infaq Jumat (Salah catat bendahara)");
  await expect(list).toContainText("Menghapus pemasukan Rp 5.000 · Infaq Jumat (Salah catat bendahara)");
  await expect(list.getByText("Bu Bendahara Uji").first()).toBeVisible(); // pelaku bendahara
  await expect(list).toContainText("Admin Uji"); // pelaku admin
  await expect(list).toContainText("Membuat undangan Bendahara (Bu Bendahara)");
  // Hanya satu entri "Mengubah" (simpan tanpa perubahan tidak dicatat).
  await expect(list.getByText(/^Mengubah pemasukan/)).toHaveCount(1);

  // Filter per jenis.
  await page.getByRole("main").getByRole("link", { name: "Pengurus", exact: true }).click();
  await expect(page.getByTestId("audit-list")).toContainText("Membuat undangan");
  await expect(page.getByTestId("audit-list")).not.toContainText("Menambah pemasukan");

  // Bendahara: hanya riwayat kas, tanpa tab Pengurus dan tanpa entri pengurus.
  await bend.goto(`/${slug}/admin/riwayat?jenis=pengurus`);
  await expect(bend.getByRole("main").getByRole("link", { name: "Pengurus", exact: true })).toHaveCount(0);
  await expect(bend.getByTestId("audit-list")).toContainText("Menambah pemasukan");
  await expect(bend.getByTestId("audit-list")).not.toContainText("Membuat undangan");
  await bctx.close();
});
