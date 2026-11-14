import { expect, registerMasjid, test } from "./helpers";

test("koreksi jadwal & iqomah tersimpan dan tampil di halaman publik", async ({ page }) => {
  const { slug } = await registerMasjid(page);
  await page.goto(`/${slug}/admin/pengaturan`);
  const preview = page.locator("tr:has(input[name=adj_subuh]) td:nth-child(2)");
  const before = (await preview.textContent())!.trim();

  await page.fill("input[name=adj_subuh]", "3");
  await expect(preview).not.toHaveText(before);
  const after = (await preview.textContent())!.trim();
  await page.fill("input[name=iqomah_maghrib]", "5");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByText("Pengaturan tersimpan.")).toBeVisible();

  await page.reload();
  await expect(page.locator("input[name=adj_subuh]")).toHaveValue("3");
  await expect(page.locator("input[name=iqomah_maghrib]")).toHaveValue("5");

  await page.goto(`/${slug}`);
  await expect(page.locator("li", { hasText: "Subuh" }).first()).toContainText(after);
});
