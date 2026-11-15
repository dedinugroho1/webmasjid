import { expect, login, registerMasjid, test, uniq } from "./helpers";

test("undang bendahara, batasi akses, password sementara, keluarkan", async ({ page, browser }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/pengurus`);
  await page.fill("#note", "Calon bendahara");
  await page.getByRole("button", { name: "Buat Link" }).click();
  const link = (await page.locator("code").textContent())!.trim();
  expect(link).toContain("/undangan/");
  // Link memakai NEXT_PUBLIC_APP_URL; di tes cukup path-nya.
  const url = new URL(link).pathname;

  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.200.0.1" } });
  const bend = await ctx.newPage();
  const email = `${uniq("bendahara")}@example.test`;
  await bend.goto(url);
  await bend.fill("#name", "Bu Bendahara");
  await bend.fill("#email", email);
  await bend.fill("#password", "bendahara123");
  await bend.check("input[name=consent]");
  await bend.getByRole("button", { name: /Buat Akun/ }).click();
  await bend.waitForURL(`**/${slug}/admin`);

  // Bendahara: Buku Kas boleh, Pengaturan tidak.
  await expect(bend.getByRole("link", { name: "Pengurus" })).toHaveCount(0);
  await bend.goto(`/${slug}/admin/pengaturan`);
  await expect(bend).toHaveURL(/error=forbidden/);

  // Link sekali pakai.
  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.getByText("Undangan tidak berlaku")).toBeVisible();
  await other.close();

  // Password sementara → sesi lama dicabut.
  await page.reload();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Atur password sementara untuk Bu Bendahara" }).click();
  const temp = (await page.locator("p.bg-amber-100 code").textContent())!.trim();
  await bend.goto(`/${slug}/admin/kas`);
  await expect(bend).toHaveURL(/\/masuk/);
  await login(bend, email, temp);

  // Ganti password sendiri.
  await bend.goto(`/${slug}/admin/akun`);
  await bend.fill("#currentPassword", temp);
  await bend.fill("#newPassword", "passwordbaru1");
  await bend.fill("#confirmPassword", "passwordbaru1");
  await bend.getByRole("button", { name: "Ganti Password" }).click();
  await expect(bend.getByText("Password diganti.")).toBeVisible();

  // Keluarkan → tidak bisa akses lagi.
  await page.reload();
  await page.getByRole("button", { name: "Keluarkan Bu Bendahara" }).click();
  await expect(page.getByText("Bu Bendahara")).toHaveCount(0);
  await bend.goto(`/${slug}/admin`);
  await expect(bend).toHaveURL(/\/masuk/);
  await ctx.close();
});
