/**
 * Slug yang tidak boleh dipakai masjid karena bentrok dengan route platform
 * (webmasjid.com/{slug}). Tambahkan bila membuat route top-level baru.
 */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "dashboard", "daftar", "masuk", "login", "logout",
  "register", "signup", "signin", "tv", "demo", "docs", "dokumentasi", "blog", "about",
  "tentang", "kontak", "contact", "privacy", "privasi", "terms", "syarat", "help", "bantuan",
  "static", "public", "assets", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
  "webmasjid", "www", "superadmin", "settings", "pengaturan", "donasi", "infaq", "jasa",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}
