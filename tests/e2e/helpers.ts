import { test as base, expect, type Page } from "@playwright/test";

export const DEMO = { slug: "al-ikhlas", email: "admin@webmasjid.test", password: "demo12345" };

/** IP acak per tes agar batas percobaan (rate limit) tidak saling mengganggu. */
export const test = base.extend({
  context: async ({ context }, use) => {
    const ip = `10.${rand()}.${rand()}.${rand()}`;
    await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await use(context);
  },
});

function rand() {
  return Math.floor(Math.random() * 250) + 1;
}

export { expect };

export async function login(page: Page, email = DEMO.email, password = DEMO.password) {
  await page.goto("/masuk");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/\/admin/);
}

export function uniq(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

/** Daftarkan masjid baru dan kembalikan slug-nya (halaman sudah login sebagai admin). */
export async function registerMasjid(page: Page) {
  const slug = uniq("uji");
  await page.goto("/daftar");
  await page.fill("#masjidName", `Masjid ${slug}`);
  await page.fill("#slug", slug);
  await page.fill("#adminName", "Admin Uji");
  await page.fill("#email", `${slug}@example.test`);
  await page.fill("#password", "rahasia123");
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await page.waitForURL(`**/${slug}/admin?welcome=1`);
  return { slug, email: `${slug}@example.test`, password: "rahasia123" };
}
