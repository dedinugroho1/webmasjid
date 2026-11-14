import { expect, registerMasjid, test } from "./helpers";

// PNG 2x2 valid untuk uji unggah.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

test("pengumuman: disematkan di atas, kedaluwarsa disembunyikan, bisa diedit", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/pengumuman`);

  const publish = async (title: string, opts: { pinned?: boolean; expires?: string } = {}) => {
    await page.fill("#title", title);
    await page.fill("#body", `Isi ${title}`);
    if (opts.expires) await page.fill("#expiresAt", opts.expires);
    if (opts.pinned) await page.check("input[name=isPinned]");
    await page.getByRole("button", { name: "Terbitkan" }).click();
    await expect(page.getByText("Pengumuman diterbitkan.")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible();
  };
  await publish("Kerja Bakti Ahad");
  await publish("Info Penting Disematkan", { pinned: true });
  await publish("Pengumuman Lama", { expires: "2020-01-01T10:00" });

  await page.goto(`/${slug}`);
  const section = page.locator("section[aria-labelledby=pengumuman]");
  await expect(section.getByRole("listitem").first()).toContainText("Info Penting Disematkan");
  await expect(section).toContainText("Kerja Bakti Ahad");
  await expect(section).not.toContainText("Pengumuman Lama");

  await page.goto(`/${slug}/admin/pengumuman`);
  await page.getByRole("listitem").filter({ hasText: "Kerja Bakti Ahad" }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/pengumuman\/[^/]+$/);
  await page.fill("#title", "Kerja Bakti Ahad Pagi");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(`**/${slug}/admin/pengumuman`);
  await expect(page.getByText("Kerja Bakti Ahad Pagi")).toBeVisible();

  // Lepas sematan.
  await page.getByRole("listitem").filter({ hasText: "Info Penting Disematkan" }).getByRole("button", { name: "Lepas sematan" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Info Penting Disematkan" }).getByRole("button", { name: "Sematkan" }),
  ).toBeVisible();
});

test("galeri: unggah foto, tampil di website dengan lightbox, hapus", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/galeri`);
  await page.setInputFiles("#image", { name: "kegiatan.png", mimeType: "image/png", buffer: PNG });
  await page.fill("#caption", "Santunan yatim");
  await page.getByRole("button", { name: "Unggah Foto" }).click();
  await expect(page.getByText("Foto ditambahkan ke galeri.")).toBeVisible();

  await page.goto(`/${slug}`);
  await page.getByRole("button", { name: "Lihat foto: Santunan yatim" }).click();
  await expect(page.locator("dialog figcaption")).toHaveText("Santunan yatim");
  await page.getByRole("button", { name: "Tutup" }).click();

  // Tolak file bukan gambar.
  await page.goto(`/${slug}/admin/galeri`);
  await page.setInputFiles("#image", { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("bukan gambar") });
  await page.getByRole("button", { name: "Unggah Foto" }).click();
  await expect(page.getByText(/Format gambar harus/)).toBeVisible();

  page.on("dialog", (d) => d.accept());
  await page.getByRole("listitem").filter({ hasText: "Santunan yatim" }).getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByText("Belum ada foto.")).toBeVisible();
  await page.goto(`/${slug}`);
  await expect(page.locator("section[aria-labelledby=galeri]")).toHaveCount(0);
});
