import { expect, registerMasjid, test } from "./helpers";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// Arahkan semua *.test ke mesin lokal agar bisa menguji domain sendiri.
test.use({ launchOptions: { args: ["--host-resolver-rules=MAP *.test 127.0.0.1"] } });

test("domain sendiri menampilkan website masjid; admin diarahkan ke domain utama", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  const domain = `${slug}.test`;

  // Domain platform ditolak.
  await page.goto(`/${slug}/admin/pengaturan`);
  await page.fill("#customDomain", "palsu.localhost");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByText("Domain ini milik platform")).toBeVisible();

  await page.fill("#customDomain", `https://${domain}/`);
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByText("Pengaturan tersimpan.")).toBeVisible();
  await page.reload();
  await expect(page.locator("#customDomain")).toHaveValue(domain);

  const origin = `http://${domain}:${PORT}`;
  await page.goto(`${origin}/`);
  await expect(page.getByRole("heading", { name: `Masjid ${slug}` })).toBeVisible();
  expect(page.url()).toBe(`${origin}/`);

  // Link absolut /{slug} dirapikan.
  await page.goto(`${origin}/${slug}`);
  expect(page.url()).toBe(`${origin}/`);

  // Login & admin diarahkan ke domain utama (NEXT_PUBLIC_APP_URL).
  await page.goto(`${origin}/admin`);
  await expect(page).toHaveURL(new RegExp(`^http://localhost:${PORT}/${slug}/admin$`));
  await page.goto(`${origin}/masuk`);
  expect(new URL(page.url()).hostname).toBe("localhost");

  // Domain tak dikenal → 404.
  const unknown = await page.goto(`http://tidak-terdaftar.test:${PORT}/`);
  expect(unknown?.status()).toBe(404);
});
