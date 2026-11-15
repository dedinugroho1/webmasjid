import { DEMO, expect, test } from "./helpers";

test("pratinjau tautan, robots, sitemap, dan manifest PWA", async ({ page, request }) => {
  await page.goto(`/${DEMO.slug}`);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toContain(`/${DEMO.slug}/opengraph-image`);
  const img = await request.get(new URL(og!).pathname);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/png");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /*/admin");
  expect(robots).toContain("Sitemap:");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/${DEMO.slug}</loc>`);

  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/masuk");
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
  }
});
