import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ubah teks menjadi slug URL: "Masjid Al-Ikhlas" → "masjid-al-ikhlas". */
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const https = (host?: string) => (host ? `https://${host}` : undefined);

/**
 * URL utama aplikasi. Urutan: NEXT_PUBLIC_APP_URL → (di Vercel) domain
 * produksi / URL branch / URL deployment → localhost. Dengan begitu deploy
 * preview Vercel langsung jalan tanpa mengisi URL secara manual.
 */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? https(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) : undefined) ||
    https(process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL) ||
    https(process.env.NEXT_PUBLIC_VERCEL_URL) ||
    "http://localhost:3000"
  );
}

/** Semua origin yang sah untuk deployment ini (dipakai Better Auth). */
export function trustedOrigins(): string[] {
  const list = [
    appUrl(),
    process.env.BETTER_AUTH_URL,
    https(process.env.VERCEL_URL),
    https(process.env.VERCEL_BRANCH_URL),
    https(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ];
  return [...new Set(list.filter((u): u is string => Boolean(u)))];
}
export const githubUrl = () => process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/dedinugroho1/webmasjid";
export const registrationOpen = () => process.env.NEXT_PUBLIC_ALLOW_REGISTRATION !== "false";
