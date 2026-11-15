import type { Browser, Page } from "@playwright/test";
import { testQuery } from "./db";
import { DEMO, expect, registerMasjid, test, uniq } from "./helpers";

const SUPER = { email: "superadmin@webmasjid.test", password: DEMO.password };

/** Halaman baru dengan IP palsu sendiri agar batas percobaan tidak saling mengganggu. */
async function freshPage(browser: Browser) {
  const ip = `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  return { ctx, page: await ctx.newPage() };
}

async function superadminPage(browser: Browser) {
  const { ctx, page } = await freshPage(browser);
  await testQuery("delete from rate_limits where key like $1", [`act:signin:email:${SUPER.email}`]);
  await page.goto("/masuk");
  await page.fill("#email", SUPER.email);
  await page.fill("#password", SUPER.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/superadmin");
  return { ctx, page };
}

async function setSwitch(page: Page, testId: string, on: boolean) {
  await page.goto("/superadmin");
  const sw = page.getByTestId(testId);
  if ((await sw.getAttribute("aria-checked")) !== String(on)) await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", String(on));
}

test("moderasi: masjid baru menunggu persetujuan, tersembunyi dari direktori, lalu disetujui atau ditolak", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const o1 = await freshPage(browser);
  const o2 = await freshPage(browser);
  try {
    await setSwitch(sa.page, "switch-moderation", true);

    // Catatan moderasi tampil di halaman daftar.
    await o1.page.goto("/daftar");
    await expect(o1.page.getByTestId("moderation-note")).toBeVisible();

    // Masjid baru: dashboard bisa dipakai, tetapi menunggu persetujuan.
    const { slug } = await registerMasjid(o1.page);
    await expect(o1.page.getByTestId("pending-banner")).toBeVisible();
    expect(await (await o1.page.request.get("/")).text()).not.toContain(`href="/${slug}"`);
    expect(await (await o1.page.request.get("/sitemap.xml")).text()).not.toContain(`/${slug}<`);
    await o1.page.goto(`/${slug}`);
    await expect(o1.page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Superadmin melihatnya di antrean.
    await sa.page.goto(`/superadmin?q=${slug}&status=menunggu`);
    const row = sa.page.getByTestId(`tenant-${slug}`);
    await expect(row).toContainText("Menunggu persetujuan");
    await expect(sa.page.getByTestId("stat-pending")).toContainText(/[1-9]/);

    // Setujui → tampil di direktori & sitemap, banner hilang, tanpa noindex.
    await row.getByRole("button", { name: "Setujui" }).click();
    // Aksi berjalan di server; baris hilang dari antrean "menunggu" begitu persetujuan tersimpan.
    await expect(sa.page.getByTestId(`tenant-${slug}`)).toHaveCount(0);
    await sa.page.goto(`/superadmin?q=${slug}`);
    await expect(sa.page.getByTestId(`tenant-${slug}`)).toContainText("Publik");
    expect(await (await o1.page.request.get("/")).text()).toContain(`href="/${slug}"`);
    expect(await (await o1.page.request.get("/sitemap.xml")).text()).toContain(`/${slug}<`);
    await o1.page.goto(`/${slug}/admin`);
    await expect(o1.page.getByTestId("pending-banner")).toHaveCount(0);
    await o1.page.goto(`/${slug}`);
    await expect(o1.page.locator('meta[name="robots"]')).toHaveCount(0);

    // Masjid kedua ditolak → ditangguhkan dengan alasan.
    const { slug: slug2 } = await registerMasjid(o2.page);
    await sa.page.goto(`/superadmin?q=${slug2}`);
    const row2 = sa.page.getByTestId(`tenant-${slug2}`);
    sa.page.once("dialog", (d) => d.accept("Data tidak jelas"));
    await row2.getByRole("button", { name: "Tolak" }).click();
    await expect(row2).toContainText("Ditangguhkan");
    await expect(row2).toContainText("Ditolak: Data tidak jelas");
    expect((await o2.page.request.get(`/${slug2}`)).status()).toBe(404);
  } finally {
    await setSwitch(sa.page, "switch-moderation", false);
    await Promise.all([sa.ctx.close(), o1.ctx.close(), o2.ctx.close()]);
  }
});

test("pendaftaran bisa ditutup dan dibuka lagi dari panel", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const visitor = await freshPage(browser);
  try {
    await setSwitch(sa.page, "switch-registration", false);
    await visitor.page.goto("/daftar");
    await expect(visitor.page.getByText(/sedang ditutup/)).toBeVisible();
    await expect(visitor.page.locator("#masjidName")).toHaveCount(0);
  } finally {
    await setSwitch(sa.page, "switch-registration", true);
  }
  await visitor.page.goto("/daftar");
  await expect(visitor.page.locator("#masjidName")).toBeVisible();
  await Promise.all([sa.ctx.close(), visitor.ctx.close()]);
});

test("daftar masjid: kontak admin, pencarian lewat email, ekspor CSV, dan halaman berikutnya", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const owner = await freshPage(browser);
  const suffix = uniq("pg").replace(/[^a-z0-9]/g, "");
  try {
    const { slug, email } = await registerMasjid(owner.page);

    // Kontak admin tampil, bisa dicari lewat email admin.
    await sa.page.goto(`/superadmin?q=${encodeURIComponent(email)}`);
    const row = sa.page.getByTestId(`tenant-${slug}`);
    await expect(row.getByTestId("admin-contact")).toContainText("Admin Uji");
    await expect(row.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);

    // Ekspor CSV memuat kontak admin; hanya superadmin yang boleh.
    const csv = await sa.page.request.get(`/superadmin/ekspor?q=${encodeURIComponent(slug)}`);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const text = await csv.text();
    expect(text).toContain("Nama admin;Email admin");
    expect(text).toContain(`${slug};`);
    expect(text).toContain(email);
    expect((await owner.page.request.get("/superadmin/ekspor")).status()).toBe(403);
    expect((await (await browser.newContext()).request.get("/superadmin/ekspor", { maxRedirects: 0 })).status()).toBeGreaterThanOrEqual(300);

    // 22 masjid → 2 halaman (20 + 2).
    await testQuery(
      `insert into tenants (id, name, slug, approved_at)
       select gen_random_uuid()::text, 'Masjid Halaman ' || g, 'halaman-' || g || '-' || $1, now() from generate_series(1, 22) g`,
      [suffix],
    );
    await sa.page.goto(`/superadmin?q=${suffix}&urut=nama`);
    await expect(sa.page.getByText(/22 masjid · Halaman 1 dari 2/)).toBeVisible();
    await expect(sa.page.locator('[data-testid^="tenant-"]')).toHaveCount(20);
    await expect(sa.page.locator('select[name="urut"]')).toHaveValue("nama");
    await sa.page.getByRole("link", { name: /Berikutnya/ }).click();
    await expect(sa.page).toHaveURL(/hal=2/);
    await expect(sa.page.getByText(/Halaman 2 dari 2/)).toBeVisible();
    await expect(sa.page.locator('[data-testid^="tenant-"]')).toHaveCount(2);
    await expect(sa.page.locator('select[name="urut"]')).toHaveValue("nama");
    await sa.page.getByRole("link", { name: /Sebelumnya/ }).click();
    await expect(sa.page.getByText(/Halaman 1 dari 2/)).toBeVisible();
  } finally {
    await testQuery("delete from tenants where slug like $1", [`halaman-%-${suffix}`]);
    await Promise.all([sa.ctx.close(), owner.ctx.close()]);
  }
});

test("pengguna: cari, ubah peran, password sementara, dan hapus akun", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const owner = await freshPage(browser);
  try {
    const { slug, email } = await registerMasjid(owner.page);

    // Akun sendiri tidak bisa diubah dari sini.
    await sa.page.goto(`/superadmin/pengguna?q=${encodeURIComponent(SUPER.email)}`);
    const self = sa.page.getByTestId(`user-${SUPER.email}`);
    await expect(self).toContainText("Anda");
    await expect(self.getByRole("button")).toHaveCount(0);

    await sa.page.goto(`/superadmin/pengguna?q=${encodeURIComponent(email)}`);
    const row = sa.page.getByTestId(`user-${email}`);
    await expect(row).toContainText(slug);

    // Turunkan menjadi Bendahara → tidak lagi bisa membuka menu Pengurus.
    await row.getByLabel(`Peran ${email}`).selectOption("BENDAHARA");
    // Aksi berjalan di server; tunggu sampai perannya benar-benar tersimpan.
    await expect
      .poll(async () => {
        await sa.page.reload();
        return sa.page.getByTestId(`user-${email}`).getByLabel(`Peran ${email}`).inputValue();
      })
      .toBe("BENDAHARA");
    await owner.page.goto(`/${slug}/admin/pengurus`);
    await expect(owner.page).toHaveURL(/error=forbidden/);

    // Password sementara: sesi lama dicabut, login dengan password baru berhasil.
    sa.page.once("dialog", (d) => d.accept());
    await sa.page.getByTestId(`user-${email}`).getByRole("button", { name: `Password sementara ${email}` }).click();
    const temp = (await sa.page.getByTestId("temp-password").locator("code").textContent())!.trim();
    expect(temp).toMatch(/^[a-z]+-\d{4}-[a-z]+$/);
    await owner.page.goto(`/${slug}/admin/kas`);
    await expect(owner.page).toHaveURL(/\/masuk/);
    await owner.page.fill("#email", email);
    await owner.page.fill("#password", temp);
    await owner.page.getByRole("button", { name: "Masuk", exact: true }).click();
    await owner.page.waitForURL(/\/admin/);

    // Hapus akun → hilang dari daftar dan tidak bisa masuk lagi.
    sa.page.once("dialog", (d) => d.accept());
    await sa.page.getByTestId(`user-${email}`).getByRole("button", { name: `Hapus akun ${email}` }).click();
    await expect(sa.page.getByTestId(`user-${email}`)).toHaveCount(0);
    await owner.page.context().clearCookies();
    await owner.page.goto("/masuk");
    await owner.page.fill("#email", email);
    await owner.page.fill("#password", temp);
    await owner.page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(owner.page.getByText("Email atau password salah.")).toBeVisible();

    // Filter "tanpa masjid" tersedia.
    await sa.page.goto("/superadmin/pengguna?peran=tanpa-masjid");
    await expect(sa.page.locator('select[name="peran"]')).toHaveValue("tanpa-masjid");
  } finally {
    await Promise.all([sa.ctx.close(), owner.ctx.close()]);
  }
});
