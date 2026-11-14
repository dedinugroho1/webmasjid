import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { events, prayerSettings, tenants, type Tenant } from "@/db/schema";
import { DEFAULT_CITY } from "./cities";

/** Ambil masjid berdasarkan slug (di-cache per request). */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug.toLowerCase())).limit(1);
  return row ?? null;
});

export const getPrayerSettings = cache(async (tenantId: string) => {
  const [row] = await db.select().from(prayerSettings).where(eq(prayerSettings.tenantId, tenantId)).limit(1);
  return row ?? { calculationMethod: "KEMENAG", iqomahOffsetMinutes: 10 };
});

/** Konfigurasi siap pakai untuk komponen jadwal sholat (server → client). */
export async function getPrayerConfig(tenant: Tenant) {
  const settings = await getPrayerSettings(tenant.id);
  return {
    latitude: tenant.latitude ?? DEFAULT_CITY.latitude,
    longitude: tenant.longitude ?? DEFAULT_CITY.longitude,
    timezone: tenant.timezone,
    method: settings.calculationMethod,
    iqomahOffsetMinutes: settings.iqomahOffsetMinutes,
  };
}

export type PrayerClientConfig = Awaited<ReturnType<typeof getPrayerConfig>>;

export async function getUpcomingEvents(tenantId: string, limit = 10) {
  // Tampilkan juga agenda yang dimulai hingga 3 jam lalu (sedang berlangsung).
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return db
    .select()
    .from(events)
    .where(and(eq(events.tenantId, tenantId), gte(events.dateTime, since)))
    .orderBy(asc(events.dateTime))
    .limit(limit);
}

export async function listPublishedTenants(limit = 48) {
  return db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      city: tenants.city,
      logoUrl: tenants.logoUrl,
    })
    .from(tenants)
    .where(eq(tenants.isPublished, true))
    .orderBy(desc(tenants.createdAt))
    .limit(limit);
}
