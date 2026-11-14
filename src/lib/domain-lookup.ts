import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";

const TTL_MS = 60_000;
const cache = new Map<string, { slug: string | null; expires: number }>();

/**
 * Cari slug masjid untuk domain sendiri. Hasil (termasuk "tidak ada")
 * di-cache 60 detik per instance agar proxy tidak membebani database.
 */
export async function slugForDomain(domain: string): Promise<string | null> {
  const hit = cache.get(domain);
  if (hit && hit.expires > Date.now()) return hit.slug;

  const [row] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(and(eq(tenants.customDomain, domain), isNull(tenants.suspendedAt)))
    .limit(1);
  const slug = row?.slug ?? null;

  if (cache.size > 5_000) cache.clear();
  cache.set(domain, { slug, expires: Date.now() + TTL_MS });
  return slug;
}
