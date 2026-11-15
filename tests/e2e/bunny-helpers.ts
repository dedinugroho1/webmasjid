import type { Page } from "@playwright/test";

export const MOCK = `http://localhost:${process.env.MOCK_BUNNY_PORT ?? 4010}`;

/** PNG 2x2 valid untuk uji unggah. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);

/** Daftar file milik satu masjid di server Bunny tiruan. */
export async function tenantFiles(page: Page, tenantId: string) {
  const all: string[] = await (await page.request.get(`${MOCK}/__files`)).json();
  return all.filter((f) => f.startsWith(`${tenantId}/`));
}

export async function tenantIdOf(page: Page) {
  const session = await (await page.request.get("/api/auth/get-session")).json();
  return session.session.tenantId as string;
}
