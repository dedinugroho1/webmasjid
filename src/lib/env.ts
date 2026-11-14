/**
 * Konfigurasi lingkungan yang dibutuhkan agar WebMasjid berjalan.
 * Tanpa `server-only` agar bisa dipakai skrip build (scripts/*.ts).
 */

/** URL database (pooled). Mendukung nama variabel dari integrasi Neon/Vercel. */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** URL database langsung (non-pooled) untuk migrasi; fallback ke URL pooled. */
export function databaseUrlUnpooled(): string | undefined {
  return process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || databaseUrl();
}

export type MissingEnv = { name: string; hint: string };

/** Variabel wajib yang belum diisi. */
export function missingEnv(): MissingEnv[] {
  const missing: MissingEnv[] = [];
  if (!databaseUrl()) {
    missing.push({
      name: "DATABASE_URL",
      hint: "Vercel → Storage → Create Database → Neon → Connect ke proyek ini (Production & Preview).",
    });
  }
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    missing.push({
      name: "BETTER_AUTH_SECRET",
      hint: "Vercel → Settings → Environment Variables. Isi string acak minimal 32 karakter (mis. hasil `openssl rand -base64 32`).",
    });
  }
  return missing;
}
