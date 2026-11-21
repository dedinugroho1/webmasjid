import type { Page } from "@playwright/test";
import { MOCK } from "./bunny-helpers";
import { clearRateLimits } from "./db";
import { expect, registerMasjid, test } from "./helpers";

type Email = { from_name: string; from_email: string; recipient: string; subject: string; content: string };

/** Tunggu email untuk penerima tertentu masuk ke Mailketing tiruan. */
async function waitForEmail(page: Page, recipient: string, match: (e: Email) => boolean = () => true) {
  let found: Email | undefined;
  await expect
    .poll(
      async () => {
        const all: Email[] = await (await page.request.get(`${MOCK}/__emails`)).json();
        found = all.findLast((e) => e.recipient === recipient && match(e));
        return Boolean(found);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return found!;
}

test("pendaftaran baru mengirim notifikasi ke pengelola platform via Mailketing", async ({ page }) => {
  const { slug, email } = await registerMasjid(page);
  const mail = await waitForEmail(page, "platform@webmasjid.test", (e) => e.subject.includes(`Masjid ${slug}`));
  expect(mail.from_name).toBe("WebMasjid Uji");
  expect(mail.from_email).toBe("noreply@webmasjid.test");
  expect(mail.content).toMatch(/^<html>/);
  expect(mail.content).toContain(`/superadmin?q=${slug}`);
  expect(mail.content).toContain(email);
});

test("lupa password: tautan dikirim via Mailketing dan bisa dipakai", async ({ page, browser }) => {
  const { email } = await registerMasjid(page);
  await clearRateLimits("reset:%");

  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.77.0.9" } });
  const visitor = await ctx.newPage();
  await visitor.goto("/lupa-password");
  await visitor.fill("#email", email);
  await visitor.getByRole("button", { name: "Kirim Link Reset" }).click();
  await expect(visitor.getByText(/tautan untuk mengatur ulang password telah dikirim/)).toBeVisible();

  const mail = await waitForEmail(visitor, email, (e) => e.subject.includes("Atur ulang password"));
  const href = mail.content.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
  expect(href, "email berisi tautan reset").toBeTruthy();
  const link = new URL(href!);
  await visitor.goto(`${link.pathname}${link.search}`);
  await visitor.waitForURL(/\/reset-password/);
  await visitor.fill("#newPassword", "PasswordBaru-123");
  await visitor.fill("#confirmPassword", "PasswordBaru-123");
  await visitor.getByRole("button", { name: "Simpan Password Baru" }).click();
  await visitor.waitForURL(/\/masuk/);

  await visitor.fill("#email", email);
  await visitor.fill("#password", "PasswordBaru-123");
  await visitor.getByRole("button", { name: "Masuk", exact: true }).click();
  await visitor.waitForURL(/\/admin/);
  await ctx.close();
});
