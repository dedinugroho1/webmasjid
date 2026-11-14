import "server-only";
import { headers } from "next/headers";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

export type RateRule = { window: number; max: number };

/**
 * Catat satu percobaan untuk `key` dan kembalikan apakah masih diizinkan.
 * Atomik (satu query upsert) sehingga aman dari request bersamaan.
 * `window` dalam detik. Kompatibel dengan `customStorage.consume` Better Auth.
 */
export async function consume(key: string, rule: RateRule): Promise<{ allowed: boolean; retryAfter: number | null }> {
  const now = Date.now();
  const windowMs = rule.window * 1000;
  const expired = sql`${rateLimits.windowStart} <= ${now - windowMs}`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then ${now} else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

  // Bersihkan entri lama sesekali (±1% request) agar tabel tidak membengkak.
  if (Math.random() < 0.01) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, now - 2 * 86_400_000)).catch(() => {});
  }

  if (row.count <= rule.max) return { allowed: true, retryAfter: null };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((Number(row.windowStart) + windowMs - now) / 1000)) };
}

/** IP klien dari header proxy (Vercel/Cloudflare/Nginx). */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} detik`;
  const m = Math.ceil(seconds / 60);
  return m < 60 ? `${m} menit` : `${Math.ceil(m / 60)} jam`;
}

/**
 * Terapkan beberapa batas sekaligus (mis. per-IP & per-email). Mengembalikan
 * pesan error berbahasa Indonesia bila salah satu terlampaui, atau `null`.
 */
export async function checkLimits(checks: { key: string; rule: RateRule }[]): Promise<string | null> {
  if (process.env.RATE_LIMIT_DISABLED === "true") return null;
  let wait = 0;
  for (const c of checks) {
    const res = await consume(`act:${c.key}`, c.rule);
    if (!res.allowed) wait = Math.max(wait, res.retryAfter ?? 60);
  }
  return wait ? `Terlalu banyak percobaan. Silakan coba lagi dalam ${formatWait(wait)}.` : null;
}

/** Aturan bawaan (window dalam detik). */
export const LIMITS = {
  signInPerIp: { window: 15 * 60, max: 30 },
  signInPerEmail: { window: 15 * 60, max: 8 },
  registerPerIp: { window: 60 * 60, max: 5 },
  resetPerIp: { window: 60 * 60, max: 10 },
  resetPerEmail: { window: 60 * 60, max: 3 },
  invitePerIp: { window: 60 * 60, max: 10 },
} satisfies Record<string, RateRule>;
