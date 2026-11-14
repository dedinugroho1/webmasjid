import { trustedOrigins } from "./utils";

/**
 * Utilitas domain: host platform vs domain sendiri milik masjid.
 * Dipakai oleh proxy (edge of request) dan form pengaturan.
 */

export const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Normalisasi input pengguna: buang protokol, path, port, "www." tidak dibuang. */
export function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Host milik platform (domain utama, alias, localhost, preview Vercel). */
export function platformHosts() {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  for (const url of trustedOrigins()) {
    try {
      if (url) hosts.add(new URL(url).hostname);
    } catch {}
  }
  for (const h of (process.env.PLATFORM_HOSTS ?? "").split(",")) if (h.trim()) hosts.add(h.trim().toLowerCase());
  return hosts;
}

export function isPlatformHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host.endsWith(".vercel.app")) return true;
  const hosts = platformHosts();
  if (hosts.has(host)) return true;
  // www.<domain utama>
  return [...hosts].some((h) => host === `www.${h}`);
}

/** Validasi domain sendiri: format benar & bukan domain/subdomain platform. */
export function validateCustomDomain(input: string): { ok: true; domain: string | null } | { ok: false; error: string } {
  const domain = normalizeDomain(input);
  if (!domain) return { ok: true, domain: null };
  if (!DOMAIN_PATTERN.test(domain)) return { ok: false, error: "Format domain tidak valid, contoh: masjidalikhlas.or.id" };
  const platform = [...platformHosts()];
  if (isPlatformHost(domain) || platform.some((h) => domain.endsWith(`.${h}`))) {
    return { ok: false, error: "Domain ini milik platform dan tidak bisa dipakai." };
  }
  return { ok: true, domain };
}
