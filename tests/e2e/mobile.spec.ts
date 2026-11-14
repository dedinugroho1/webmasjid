import { devices } from "@playwright/test";
import { DEMO, expect, login, test } from "./helpers";

test.use({ ...devices["Pixel 7"] });

const PUBLIC = ["/", `/${DEMO.slug}`, "/masuk", "/daftar"];
const ADMIN = ["", "/kas", "/kas/jumat", "/jumat", "/kajian", "/agenda", "/pengumuman", "/galeri", "/pengurus", "/pengaturan", "/akun"];

async function expectNoHorizontalScroll(page: import("@playwright/test").Page, path: string) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, `${path} melebar ke samping (${scroll}px > ${width}px)`).toBeLessThanOrEqual(width + 1);
}

test("halaman publik tidak melebar di HP", async ({ page }) => {
  for (const path of PUBLIC) {
    await page.goto(path);
    await expectNoHorizontalScroll(page, path);
  }
});

test("dashboard admin tidak melebar di HP", async ({ page }) => {
  await login(page);
  for (const path of ADMIN) {
    await page.goto(`/${DEMO.slug}/admin${path}`);
    await expectNoHorizontalScroll(page, path || "/admin");
  }
});
