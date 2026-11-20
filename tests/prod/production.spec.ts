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

let galleryPhoto: string | null = null;
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
  const openedAt = Date.now();
  await page.fill("#masjidName", `Masjid Uji ${stamp}`);
  await page.fill("#slug", SLUG);
  await page.selectOption("#city", "Bandung");
  await page.fill("#adminName", ADMIN.name);
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", ADMIN.password);
  // Form pendaftaran menolak kiriman < 3 detik (anti-bot).
  await page.waitForTimeout(Math.max(0, 3500 - (Date.now() - openedAt)));
  await page.check("input[name=consent]");
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

  // Setiap tambah/ubah/hapus tercatat di riwayat perubahan, lengkap dengan pelakunya.
  await page.goto(`/${SLUG}/admin/riwayat?jenis=kas`);
  const audit = page.getByTestId("audit-list");
  await expect(audit).toContainText("Menambah pemasukan Rp 2.500.000 · Infaq Jumat (Kotak Jumat uji)");
  await expect(audit).toContainText("Mengubah pengeluaran Listrik: nominal Rp 300.000 → Rp 350.000");
  await expect(audit).toContainText("Menghapus pemasukan Rp 1.000 · Infaq Jumat (Salah catat uji)");
  await expect(audit.getByText(ADMIN.name).first()).toBeVisible();
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
  // Bila Bunny dikonfigurasi (BUNNY_CDN_URL di environment tes), foto harus berasal dari CDN, bukan data URL.
  const photo = await page.locator("section[aria-labelledby=galeri] img").first().getAttribute("src");
  galleryPhoto = photo;
  if (process.env.BUNNY_CDN_URL) {
    expect(photo, "foto galeri harus memakai URL CDN Bunny").toContain(`${process.env.BUNNY_CDN_URL.replace(/\/+$/, "")}/`);
    let status = 0;
    for (let i = 0; i < 20 && status !== 200; i++) {
      status = (await page.request.get(photo!)).status();
      if (status !== 200) await page.waitForTimeout(3000);
    }
    expect(status, "CDN harus menyajikan foto").toBe(200);
  } else {
    expect(photo).toMatch(/^(data:|https?:)/);
  }
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
  await b.check("input[name=consent]");
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
  // Bila moderasi sedang aktif di platform, setujui dulu agar sisa tes tidak bergantung pada pengaturan itu.
  if (await row.getByText("Menunggu persetujuan").count()) {
    await row.getByRole("button", { name: "Setujui" }).click();
    await expect(row.getByText("Publik")).toBeVisible();
  }
  page.once("dialog", (d) => d.accept("Uji produksi"));
  await row.getByRole("button", { name: "Tangguhkan" }).click();
  await expect(row.getByText("Ditangguhkan")).toBeVisible();
  expect((await page.request.get(`/${SLUG}`)).status()).toBe(404);

  await row.getByRole("button", { name: "Pulihkan" }).click();
  await expect(row.getByText("Publik")).toBeVisible();
  expect((await page.request.get(`/${SLUG}`)).status()).toBe(200);

  // Aksi massal tersedia (tidak dijalankan di production), tombol hapus ada untuk masjid non-demo.
  await expect(row.getByRole("button", { name: "Hapus", exact: true })).toBeVisible();

  // Kontak admin, ekspor CSV, dan tombol pengaturan platform (hanya dilihat, tidak diubah di production).
  await expect(row.getByTestId("admin-contact")).toContainText(ADMIN.email);
  await expect(page.getByTestId("switch-registration")).toBeVisible();
  await expect(page.getByTestId("switch-moderation")).toBeVisible();
  const csv = await page.request.get(`/superadmin/ekspor?q=${encodeURIComponent(SLUG)}`);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(ADMIN.email);

  // Halaman pengguna: akun uji ditemukan lewat email; akun sendiri tanpa tombol ubah.
  await page.goto(`/superadmin/pengguna?q=${encodeURIComponent(ADMIN.email)}`);
  const me = page.getByTestId(`user-${ADMIN.email}`);
  await expect(me).toContainText("Anda");
  await expect(me.getByRole("button")).toHaveCount(0);

  // Riwayat platform mencatat penangguhan & pemulihan tadi beserta pelakunya (email tersamar).
  await page.goto(`/superadmin/riwayat?q=${SLUG}`);
  const log = page.getByTestId("platform-audit-list");
  await expect(log).toContainText("Masjid ditangguhkan");
  await expect(log).toContainText("Uji produksi");
  await expect(log).toContainText("Masjid dipulihkan");
  await expect(log).toContainText("ad***@prod-uji.test");
  await expect(log).not.toContainText(ADMIN.email);
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

test("13. ekspor buku kas ke Excel (CSV)", async () => {
  await page.goto("/masuk");
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/\/(superadmin|admin)/);
  const csv = await page.request.get(`/${SLUG}/admin/kas/ekspor?bulan=semua`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("Tanggal;Jenis;Kas;Kategori;Keterangan;Pemasukan;Pengeluaran");
  expect(text).toContain("Kotak Jumat uji");
});

test("14. mode demo: bisa dijelajahi, perubahan ditolak", async ({ browser }) => {
  const dctx = await browser.newContext();
  const d = await dctx.newPage();
  await d.goto("/");
  await d.getByRole("link", { name: "Coba Dashboard Demo" }).click();
  await d.getByRole("button", { name: "Masuk", exact: true }).click();
  await d.waitForURL("**/al-ikhlas/admin");
  await expect(d.getByText("Mode demo", { exact: true })).toBeVisible();

  await d.goto("/al-ikhlas/admin/akun");
  await d.fill("#currentPassword", "demo12345");
  await d.fill("#newPassword", "dibajak-123");
  await d.fill("#confirmPassword", "dibajak-123");
  await d.getByRole("button", { name: "Ganti Password" }).click();
  await expect(d.getByText(/Mode demo: perubahan tidak disimpan/)).toBeVisible();
  const api = await d.request.post("/api/auth/change-password", {
    headers: { origin: new URL(d.url()).origin },
    data: { currentPassword: "demo12345", newPassword: "dibajak-456" },
  });
  expect(api.status()).toBe(403);
  await dctx.close();
});

test("15a. halaman hukum, health check, dan tanpa placeholder di landing", async ({ request }) => {
  expect((await request.get("/privasi")).status()).toBe(200);
  expect((await request.get("/syarat")).status()).toBe(200);
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok", db: "ok" });

  await page.goto("/");
  const html = await page.content();
  expect(html).not.toContain("NEXT_PUBLIC_PLATFORM_QRIS_URL");
  expect(html).not.toContain("halo@webmasjid.com");
  await page.getByRole("link", { name: "Kebijakan Privasi" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kebijakan Privasi" })).toBeVisible();
});

test("15. pratinjau tautan, robots, sitemap & PWA", async ({ request }) => {
  await page.goto("/al-ikhlas");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toContain("/al-ikhlas/opengraph-image");
  const img = await request.get(new URL(og!).pathname);
  expect(img.headers()["content-type"]).toBe("image/png");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /*/admin");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/al-ikhlas</loc>");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("WebMasjid");
});

test("16. tampilan HP tidak melebar", async ({ browser }) => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  for (const path of ["/", "/al-ikhlas", "/masuk", "/daftar"]) {
    await mp.goto(path);
    await noHorizontalScroll(mp);
  }
  await m.close();
});

test("17. hapus masjid: halaman, akun, dan foto di Bunny ikut terhapus", async () => {
  // Akun uji berstatus superadmin sejak tes 11; ia boleh menghapus masjid, akunnya tidak ikut terhapus.
  await page.goto(`/${SLUG}/admin/pengaturan`);
  page.once("dialog", (d) => d.accept());
  await page.getByLabel(/Ketik/).fill("salah");
  await page.getByRole("button", { name: "Hapus Masjid Permanen" }).click();
  await expect(page.getByText(/Ketik persis/)).toBeVisible();
  expect((await page.request.get(`/${SLUG}`)).status()).toBe(200);

  page.once("dialog", (d) => d.accept());
  await page.getByLabel(/Ketik/).fill(SLUG);
  await page.getByRole("button", { name: "Hapus Masjid Permanen" }).click();
  await page.waitForURL(/\/masuk\?dihapus=1/);
  await expect(page.getByText(/telah dihapus permanen/)).toBeVisible();
  expect((await page.request.get(`/${SLUG}`)).status()).toBe(404);

  // Penghapusan tercatat di riwayat platform (akun uji masih superadmin).
  await page.fill("#email", ADMIN.email);
  await page.fill("#password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/superadmin");
  await page.goto(`/superadmin/riwayat?q=${SLUG}`);
  await expect(page.getByTestId("platform-audit-entry").first()).toContainText("Masjid dihapus");

  // File di penyimpanan asal Bunny harus hilang. (Alamat CDN bisa tetap menyajikan salinan cache
  // sebentar, jadi yang diperiksa adalah penyimpanan asalnya, bukan CDN.) Butuh password zone di environment tes.
  const { BUNNY_STORAGE_ZONE: zone, BUNNY_STORAGE_PASSWORD: key, BUNNY_STORAGE_REGION: region } = process.env;
  if (zone && key && galleryPhoto?.includes(".b-cdn.net/")) {
    const host = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
    const path = new URL(galleryPhoto).pathname;
    let status = 200;
    for (let i = 0; i < 10 && status !== 404; i++) {
      status = (await fetch(`https://${host}/${zone}${path}`, { headers: { AccessKey: key } })).status;
      if (status !== 404) await page.waitForTimeout(2000);
    }
    expect(status, "file di Bunny Storage harus terhapus").toBe(404);
  }
});
