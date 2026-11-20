import type { Browser, Page } from "@playwright/test";
import { testQuery } from "./db";
import { DEMO, expect, registerMasjid, test } from "./helpers";

const SUPER = { email: "superadmin@webmasjid.test", password: DEMO.password };

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

async function setModeration(page: Page, on: boolean) {
  await page.goto("/superadmin");
  const sw = page.getByTestId("switch-moderation");
  if ((await sw.getAttribute("aria-checked")) !== String(on)) await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", String(on));
}

test("aksi massal: setujui dan tolak beberapa pendaftaran sekaligus, tercatat di riwayat", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const owners = await Promise.all([freshPage(browser), freshPage(browser), freshPage(browser)]);
  try {
    await setModeration(sa.page, true);
    const regs: Awaited<ReturnType<typeof registerMasjid>>[] = [];
    for (const o of owners) regs.push(await registerMasjid(o.page));

    await sa.page.goto("/superadmin?status=menunggu");
    const bar = sa.page.getByTestId("bulk-bar");
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("button", { name: /Setujui terpilih \(0\)/ })).toBeDisabled();

    // Pilih dua yang pertama → setujui.
    for (const r of regs.slice(0, 2)) await sa.page.getByLabel(`Pilih Masjid ${r.slug}`, { exact: true }).check();
    await bar.getByRole("button", { name: "Setujui terpilih (2)" }).click();
    await expect(bar.getByRole("status")).toHaveText("2 masjid disetujui.");
    for (const r of regs.slice(0, 2)) await expect(sa.page.getByTestId(`tenant-${r.slug}`)).toHaveCount(0);

    // Yang ketiga ditolak lewat aksi massal.
    await sa.page.getByLabel(`Pilih Masjid ${regs[2].slug}`, { exact: true }).check();
    sa.page.once("dialog", (d) => d.accept("Duplikat"));
    await bar.getByRole("button", { name: "Tolak terpilih (1)" }).click();
    await expect(sa.page.getByTestId(`tenant-${regs[2].slug}`)).toHaveCount(0);
    await sa.page.goto(`/superadmin?q=${regs[2].slug}`);
    await expect(sa.page.getByTestId(`tenant-${regs[2].slug}`)).toContainText("Ditolak: Duplikat");
    await sa.page.goto(`/superadmin?q=${regs[0].slug}`);
    await expect(sa.page.getByTestId(`tenant-${regs[0].slug}`)).toContainText("Publik");

    // Riwayat platform mencatat ketiganya beserta pelakunya.
    await sa.page.goto(`/superadmin/riwayat?q=${regs[0].slug}`);
    const entry = sa.page.getByTestId("platform-audit-entry").first();
    await expect(entry).toContainText("Masjid disetujui");
    await expect(entry).toContainText("disetujui (massal)");
    await expect(entry).toContainText(/oleh .+ \(su\*\*\*@webmasjid\.test\)/);
    await sa.page.goto(`/superadmin/riwayat?q=${regs[2].slug}`);
    await expect(sa.page.getByTestId("platform-audit-entry").first()).toContainText("Pendaftaran ditolak");
    await expect(sa.page.getByTestId("platform-audit-entry").first()).toContainText("Duplikat");

    // Pengaturan yang diubah juga tercatat; filter jenis bekerja.
    await sa.page.goto("/superadmin/riwayat?jenis=setting");
    await expect(sa.page.locator('select[name="jenis"]')).toHaveValue("setting");
    await expect(sa.page.getByTestId("platform-audit-entry").first()).toContainText("Moderasi pendaftaran diaktifkan");
    await expect(sa.page.getByTestId("platform-audit-list")).not.toContainText("Masjid disetujui");
  } finally {
    await setModeration(sa.page, false);
    await Promise.all([sa.ctx.close(), ...owners.map((o) => o.ctx.close())]);
  }
});

test("hapus masjid dari panel superadmin dengan konfirmasi slug", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const owner = await freshPage(browser);
  try {
    const { slug, email, password } = await registerMasjid(owner.page);
    await sa.page.goto(`/superadmin?q=${slug}`);
    const row = sa.page.getByTestId(`tenant-${slug}`);
    await row.getByRole("button", { name: "Hapus", exact: true }).click();
    const confirm = row.getByLabel(`Konfirmasi hapus ${slug}`);
    const submit = row.getByRole("button", { name: "Hapus permanen" });
    await expect(submit).toBeDisabled();
    await confirm.fill("salah");
    await expect(submit).toBeDisabled();
    await confirm.fill(slug);
    await submit.click();
    await expect(sa.page.getByTestId(`tenant-${slug}`)).toHaveCount(0);

    // Halaman publik hilang dan akun pengurusnya tidak bisa masuk lagi.
    expect((await owner.page.request.get(`/${slug}`)).status()).toBe(404);
    await owner.page.context().clearCookies();
    await owner.page.goto("/masuk");
    await owner.page.fill("#email", email);
    await owner.page.fill("#password", password);
    await owner.page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(owner.page.getByText("Email atau password salah.")).toBeVisible();

    // Tercatat di riwayat.
    await sa.page.goto(`/superadmin/riwayat?q=${slug}`);
    const entry = sa.page.getByTestId("platform-audit-entry").first();
    await expect(entry).toContainText("Masjid dihapus");
    await expect(entry).toContainText("dihapus permanen oleh superadmin");

    // Masjid demo tidak bisa dihapus dari panel.
    await sa.page.goto(`/superadmin?q=${DEMO.slug}`);
    await expect(sa.page.getByTestId(`tenant-${DEMO.slug}`).getByRole("button", { name: "Hapus", exact: true })).toHaveCount(0);
  } finally {
    await Promise.all([sa.ctx.close(), owner.ctx.close()]);
  }
});

test("riwayat: perubahan akun pengguna tercatat dengan email tersamar, dan hanya untuk superadmin", async ({ browser }) => {
  const sa = await superadminPage(browser);
  const owner = await freshPage(browser);
  try {
    const { email } = await registerMasjid(owner.page);
    await sa.page.goto(`/superadmin/pengguna?q=${encodeURIComponent(email)}`);
    await sa.page.getByTestId(`user-${email}`).getByLabel(`Peran ${email}`).selectOption("BENDAHARA");
    const masked = `${email.slice(0, 2)}***@example.test`;
    await expect
      .poll(async () => {
        await sa.page.goto("/superadmin/riwayat?jenis=user");
        return sa.page.getByTestId("platform-audit-list").textContent();
      })
      .toContain(`Peran Admin Uji (${masked}) diubah dari Admin DKM menjadi Bendahara`);
    await expect(sa.page.getByTestId("platform-audit-list")).not.toContainText(email);

    // Tab Riwayat ada di navigasi; pengurus masjid biasa tidak bisa membukanya.
    await expect(sa.page.getByRole("link", { name: "Riwayat", exact: true })).toBeVisible();
    await owner.page.goto("/superadmin/riwayat");
    await expect(owner.page).toHaveURL(/\/masuk\?error=forbidden/);
  } finally {
    await Promise.all([sa.ctx.close(), owner.ctx.close()]);
  }
});
