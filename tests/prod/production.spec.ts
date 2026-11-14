/**
 * Tes menyeluruh terhadap deployment sungguhan (production / preview).
 * Satu masjid uji dibuat lalu dipakai semua tes secara berurutan; data
 * dibersihkan oleh teardown.ts. Batas percobaan tetap aktif — jumlah
 * pendaftaran & login sengaja dijaga sedikit.
 */
import { execSync } from "node:child_process";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const stamp = Date.now().toString(36);
const SLUG = `prod-uji-${stamp}`;
const ADMIN = { name: "Admin Uji Produksi", email: `admin-${stamp}@prod-uji.test`, password: "UjiProduksi-123" };
const NEW_PASSWORD = "UjiProduksi-456";
const BENDAHARA = { name: "Bendahara Uji", email: `bendahara-${stamp}@prod-uji.test`, password: "Bendahara-123" };
// PNG 2x2 valid.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

let ctx: BrowserContext;
let page: Page;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext();
  page = await ctx.newPage();
});

test.afterAll(async () => {
  await ctx?.close();
});

async function noHorizontalScroll(p: Page) {
  const { scroll, width } = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, `${p.url()} melebar`).toBeLessThanOrEqual(width + 1);
}

test("1. halaman publik & masjid demo", async () => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Website masjid");
  await expect(page.locator('a[href="/al-ikhlas"]').first()).toBeVisible();

  expect((await page.goto("/al-ikhlas"))?.status()).toBe(200);
  for (const id of ["jumat", "kajian", "kas", "infaq", "agenda"]) {
    await expect(page.locator(`section[aria-labelledby=${id}]`)).toBeVisible();
  }
  await expect(page.getByText("Subuh").first()).toBeVisible();
  await expect(page.getByText(/Laporan kas Jumat/i)).toBeVisible();

  expect((await page.goto("/masjid-yang-tidak-ada-xyz"))?.status()).toBe(404);
  expect((await page.goto("/al-ikhlas/tv"))?.status()).toBe(404);
  // Admin tanpa login → halaman masuk.
  await page.goto("/al-ikhlas/admin");
  await expect(page).toHaveURL(/\/masuk\?next=/);
});

test("2. daftar masjid baru (Better Auth + tenant)", async () => {
  await page.goto("/daftar");
  await page.fill("#masjidName", `Masjid Uji ${stamp}`);
  await page.fill("#slug", SLUG);
  await page.selectOption("#city", "Bandung");
  await page.fill("#adminName", ADMIN.name);
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await page.waitForURL(`**/${SLUG}/admin?welcome=1`);
  await expect(page.getByText(/Ahlan wa sahlan/)).toBeVisible();

  const session = await (await page.request.get("/api/auth/get-session")).json();
  expect(session.user.email).toBe(ADMIN.email);
  expect(session.user.role).toBe("DKM_ADMIN");
  expect(session.session.tenantId).toBeTruthy();
});

test("3. isolasi antar-masjid", async () => {
  await page.goto("/al-ikhlas/admin/kas");
  await expect(page).toHaveURL(/error=forbidden/);
  expect((await page.request.get("/al-ikhlas/admin/kas/laporan")).status()).toBe(403);
});

test("4. pengaturan: lokasi, koreksi jadwal, rekening", async () => {
  await page.goto(`/${SLUG}/admin/pengaturan`);
  await page.fill("#address", "Jl. Uji Produksi No. 1");
  await page.fill("#phone", "0812-1111-2222");
  await page.fill("input[name=adj_subuh]", "2");
  await page.fill("input[name=iqomah_maghrib]", "5");
  await page.fill("#bankAccounts", "BSI | 7000123456 | DKM Masjid Uji");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByText("Pengaturan tersimpan.")).toBeVisible();
  await page.reload();
  await expect(page.locator("input[name=adj_subuh]")).toHaveValue("2");

  await page.goto(`/${SLUG}`);
  await expect(page.getByText("Jl. Uji Produksi No. 1")).toBeVisible();
  await expect(page.getByText("7000123456")).toBeVisible();
});

test("5. buku kas: infaq Jumat cepat, pengeluaran, edit, hapus", async () => {
  await page.goto(`/${SLUG}/admin`);
  await page.getByRole("link", { name: "Catat Infaq Jumat" }).click();
  await page.waitForURL(/catat=infaq-jumat/);
  await expect(page.locator("#category")).toHaveValue("Infaq Jumat");
  await page.fill("#amount", "2500000");
  await page.fill("#description", "Kotak Jumat uji");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByText("Transaksi tersimpan.")).toBeVisible();

  await page.goto(`/${SLUG}/admin/kas`);
  await page.getByRole("button", { name: "Pengeluaran", exact: true }).click();
  await page.fill("#amount", "300000");
  await page.fill("#description", "Token listrik uji");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByRole("cell", { name: /Token listrik uji/ })).toBeVisible();

  await page.getByRole("row", { name: /Token listrik uji/ }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/admin\/kas\/[^/?]+$/);
  await page.fill("#amount", "350000");
  await page.getByRole("button", { name: "Simpan Perubahan" }).click();
  await page.waitForURL(/\/admin\/kas\?bulan=/);
  await expect(page.getByRole("row", { name: /Token listrik uji/ })).toContainText("350.000");

  // Transaksi sementara untuk diuji hapus.
  await page.fill("#amount", "1000");
  await page.fill("#description", "Salah catat uji");
  await page.getByRole("button", { name: "Simpan Transaksi" }).click();
  await expect(page.getByRole("cell", { name: /Salah catat uji/ })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("row", { name: /Salah catat uji/ }).getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("cell", { name: /Salah catat uji/ })).toHaveCount(0);

  await page.goto(`/${SLUG}`);
  await expect(page.getByText("Kotak Jumat uji")).toBeVisible();
});

test("6. laporan kas Jumat, PDF bulanan, cetak papan info", async () => {
  await page.goto(`/${SLUG}/admin/kas/jumat`);
  const text = page.locator("pre");
  await expect(text).toContainText(`LAPORAN KAS MASJID UJI ${stamp.toUpperCase()}`);
  await expect(text).toContainText("Infaq Jumat: Rp 2.500.000");
  await expect(page.getByRole("link", { name: "Kirim ke WhatsApp" })).toHaveAttribute("href", /wa\.me/);

  const pdf = await page.request.get(`/${SLUG}/admin/kas/laporan`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.goto(`/${SLUG}/admin/cetak`);
  await expect(page.getByText("Petugas Sholat Jumat")).toBeVisible();
  await expect(page.getByText(/Jadwal Sholat/).first()).toBeVisible();
  await expect(page.getByText(/Saldo Kas per/)).toBeVisible();
});

test("7. petugas Jumat & kajian rutin", async () => {
  await page.goto(`/${SLUG}/admin/jumat`);
  const first = page.locator("form[aria-label^='Petugas Jumat']").first();
  await first.getByLabel("Khatib").fill("Ust. Khatib Uji");
  await first.getByLabel("Imam").fill("Ust. Imam Uji");
  await first.getByLabel("Muadzin").fill("Sdr. Muadzin Uji");
  await first.getByRole("button", { name: "Simpan" }).click();
  await expect(first.getByRole("button", { name: "Tersimpan" })).toBeVisible();

  await page.goto(`/${SLUG}/admin/kajian`);
  await page.selectOption("#dayOfWeek", "0");
  await page.fill("#time", "Ba'da Subuh");
  await page.fill("#title", "Tafsir Uji Produksi");
  await page.fill("#ustadz", "Ust. Kajian Uji");
  await page.getByRole("button", { name: "Tambah Kajian Rutin" }).click();
  await expect(page.getByText("Kajian rutin tersimpan.")).toBeVisible();

  await page.goto(`/${SLUG}`);
  await expect(page.locator("section[aria-labelledby=jumat]")).toContainText("Ust. Khatib Uji");
  await expect(page.locator("section[aria-labelledby=kajian]")).toContainText("Tafsir Uji Produksi");
});

test("8. agenda, pengumuman, galeri", async () => {
  await page.goto(`/${SLUG}/admin/agenda`);
  await page.fill("#dateTime", "2030-01-10T19:30");
  await page.fill("#title", "Tabligh Akbar Uji");
  await page.getByRole("button", { name: "Simpan Agenda" }).click();
  await expect(page.getByText("Agenda tersimpan.")).toBeVisible();

  await page.goto(`/${SLUG}/admin/pengumuman`);
  await page.fill("#title", "Pengumuman Uji Produksi");
  await page.fill("#body", "Isi pengumuman uji.");
  await page.check("input[name=isPinned]");
  await page.getByRole("button", { name: "Terbitkan" }).click();
  await expect(page.getByText("Pengumuman diterbitkan.")).toBeVisible();

  await page.goto(`/${SLUG}/admin/galeri`);
  await page.setInputFiles("#image", { name: "uji.png", mimeType: "image/png", buffer: PNG });
  await page.fill("#caption", "Foto uji produksi");
  await page.getByRole("button", { name: "Unggah Foto" }).click();
  await expect(page.getByText("Foto ditambahkan ke galeri.")).toBeVisible();

  await page.goto(`/${SLUG}`);
  await expect(page.locator("section[aria-labelledby=pengumuman]")).toContainText("Pengumuman Uji Produksi");
  await expect(page.locator("section[aria-labelledby=agenda]")).toContainText("Tabligh Akbar Uji");
  await page.getByRole("button", { name: "Lihat foto: Foto uji produksi" }).click();
  await expect(page.locator("dialog figcaption")).toHaveText("Foto uji produksi");
  await page.getByRole("button", { name: "Tutup" }).click();
});

test("9. undang bendahara: akses terbatas, lalu dikeluarkan", async ({ browser }) => {
  await page.goto(`/${SLUG}/admin/pengurus`);
  await page.fill("#note", "Bendahara uji");
  await page.getByRole("button", { name: "Buat Link" }).click();
  const link = (await page.locator("code").textContent())!.trim();
  expect(link).toContain("/undangan/");

  const bctx = await browser.newContext();
  const b = await bctx.newPage();
  await b.goto(new URL(link).pathname);
  await b.fill("#name", BENDAHARA.name);
  await b.fill("#email", BENDAHARA.email);
  await b.fill("#password", BENDAHARA.password);
  await b.getByRole("button", { name: /Buat Akun/ }).click();
  await b.waitForURL(`**/${SLUG}/admin`);
  await expect(b.getByRole("link", { name: "Pengurus" })).toHaveCount(0);
  await b.goto(`/${SLUG}/admin/pengaturan`);
  await expect(b).toHaveURL(/error=forbidden/);
  await b.goto(`/${SLUG}/admin/kas/jumat`);
  await expect(b.locator("pre")).toContainText("LAPORAN KAS");

  // Link sekali pakai.
  await b.goto(new URL(link).pathname);
  await expect(b.getByText("Undangan tidak berlaku")).toBeVisible();

  await page.reload();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Keluarkan ${BENDAHARA.name}` }).click();
  await expect(page.getByText(BENDAHARA.email)).toHaveCount(0);
  await b.goto(`/${SLUG}/admin`);
  await expect(b).toHaveURL(/\/masuk/);
  await bctx.close();
});

test("10. ganti password, logout, login ulang, password salah", async () => {
  await page.goto(`/${SLUG}/admin/akun`);
  await page.fill("#currentPassword", ADMIN.password);
  await page.fill("#newPassword", NEW_PASSWORD);
  await page.fill("#confirmPassword", NEW_PASSWORD);
  await page.getByRole("button", { name: "Ganti Password" }).click();
  await page.waitForURL(/akun\?diganti=1/);

  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL("**/masuk");
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password); // password lama
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText("Email atau password salah.")).toBeVisible();

  await page.fill("#password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(`**/${SLUG}/admin`);
});

test("11. superadmin: tangguhkan & pulihkan masjid", async () => {
  // Promosikan akun uji menjadi superadmin (sesi dicabut → login ulang).
  execSync(`npx tsx scripts/make-superadmin.ts ${ADMIN.email}`, { stdio: "pipe", env: process.env });
  await page.goto("/masuk");
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/superadmin");

  await page.fill("input[name=q]", SLUG);
  await page.getByRole("button", { name: "Cari" }).click();
  const row = page.getByTestId(`tenant-${SLUG}`);
  page.once("dialog", (d) => d.accept("Uji produksi"));
  await row.getByRole("button", { name: "Tangguhkan" }).click();
  await expect(row.getByText("Ditangguhkan")).toBeVisible();
  expect((await page.request.get(`/${SLUG}`)).status()).toBe(404);

  await row.getByRole("button", { name: "Pulihkan" }).click();
  await expect(row.getByText("Publik")).toBeVisible();
  expect((await page.request.get(`/${SLUG}`)).status()).toBe(200);
});

test("12. batas percobaan API aktif", async ({ request }) => {
  const codes: number[] = [];
  for (let i = 0; i < 12; i++) {
    const res = await request.post("/api/auth/sign-in/email", {
      headers: { origin: new URL(page.url()).origin },
      data: { email: `tidak-ada-${stamp}@prod-uji.test`, password: "salah-sekali" },
    });
    codes.push(res.status());
  }
  expect(codes, codes.join(",")).toContain(429);
});

test("13. tampilan HP tidak melebar", async ({ browser }) => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  for (const path of ["/", "/al-ikhlas", "/masuk", "/daftar"]) {
    await mp.goto(path);
    await noHorizontalScroll(mp);
  }
  await m.close();
});
