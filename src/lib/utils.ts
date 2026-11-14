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

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const githubUrl = () => process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/dedinugroho1/webmasjid";
export const registrationOpen = () => process.env.NEXT_PUBLIC_ALLOW_REGISTRATION !== "false";
