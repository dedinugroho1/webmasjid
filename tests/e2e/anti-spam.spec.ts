import { expect, test, uniq, waitForHumanPace } from "./helpers";

async function fill(page: import("@playwright/test").Page, data: { masjid: string; admin: string; email: string }) {
  await page.fill("#masjidName", data.masjid);
  await page.fill("#slug", uniq("spam"));
  await page.fill("#adminName", data.admin);
  await page.fill("#email", data.email);
  await page.fill("#password", "rahasia123");
}

test("pendaftaran yang dikirim terlalu cepat ditolak (bot)", async ({ page }) => {
  await page.goto("/daftar");
  await fill(page, { masjid: "Masjid Bot Cepat", admin: "Bot", email: `${uniq("bot")}@example.test` });
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText(/terlalu cepat/)).toBeVisible();
  // Isian tetap ada; setelah menunggu, kiriman ulang diterima.
  await expect(page.locator("#masjidName")).toHaveValue("Masjid Bot Cepat");
});

test("email sekali pakai dan nama berisi tautan ditolak", async ({ page }) => {
  await page.goto("/daftar");
  const openedAt = Date.now();
  await fill(page, { masjid: "Masjid Nurul Iman", admin: "Pak Iman", email: "iseng@mailinator.com" });
  await waitForHumanPace(page, openedAt);
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText(/bukan email sementara/)).toBeVisible();

  await page.fill("#email", `${uniq("iman")}@example.test`);
  await page.fill("#masjidName", "Promo slot gacor www.contoh.xyz");
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText(/tidak boleh berisi tautan/)).toBeVisible();
});

test("token waktu palsu ditolak", async ({ page }) => {
  await page.goto("/daftar");
  const openedAt = Date.now();
  await fill(page, { masjid: "Masjid Token Palsu", admin: "Pak Palsu", email: `${uniq("palsu")}@example.test` });
  await page.evaluate(() => {
    (document.querySelector("input[name=formToken]") as HTMLInputElement).value = `${Date.now() - 60_000}.palsu`;
  });
  await waitForHumanPace(page, openedAt);
  await page.getByRole("button", { name: /Daftarkan Masjid/ }).click();
  await expect(page.getByText(/kedaluwarsa/)).toBeVisible();
});
