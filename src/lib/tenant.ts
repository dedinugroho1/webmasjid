import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  announcements,
  events,
  galleryItems,
  jumatSchedules,
  prayerSettings,
  routineKajian,
  tenants,
  type Tenant,
} from "@/db/schema";
import { DEFAULT_CITY } from "./cities";

/** Ambil masjid berdasarkan slug (di-cache per request). */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug.toLowerCase())).limit(1);
  return row ?? null;
});

/** Untuk halaman publik: masjid yang ditangguhkan dianggap tidak ada. */
export async function getPublicTenantBySlug(slug: string) {
  const tenant = await getTenantBySlug(slug);
  return tenant && !tenant.suspendedAt ? tenant : null;
}

export const getPrayerSettings = cache(async (tenantId: string) => {
  const [row] = await db.select().from(prayerSettings).where(eq(prayerSettings.tenantId, tenantId)).limit(1);
  return row ?? { calculationMethod: "KEMENAG", iqomahOffsetMinutes: 10, adjustments: {}, iqomahMinutes: {} };
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
    adjustments: settings.adjustments,
    iqomahMinutes: settings.iqomahMinutes,
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

/** Pengumuman yang belum kedaluwarsa; disematkan lebih dulu. */
export async function getActiveAnnouncements(tenantId: string, limit = 5) {
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.tenantId, tenantId),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, new Date())),
      ),
    )
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
    .limit(limit);
}

export async function getGallery(tenantId: string, limit = 12) {
  return db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.tenantId, tenantId))
    .orderBy(desc(galleryItems.takenAt), desc(galleryItems.createdAt))
    .limit(limit);
}

export async function getJumatSchedules(tenantId: string, dates: string[]) {
  if (!dates.length) return [];
  return db
    .select()
    .from(jumatSchedules)
    .where(and(eq(jumatSchedules.tenantId, tenantId), inArray(jumatSchedules.date, dates)));
}

export async function getActiveKajian(tenantId: string) {
  return db
    .select()
    .from(routineKajian)
    .where(and(eq(routineKajian.tenantId, tenantId), eq(routineKajian.isActive, true)))
    .orderBy(asc(routineKajian.dayOfWeek), asc(routineKajian.createdAt));
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
    .where(and(eq(tenants.isPublished, true), isNull(tenants.suspendedAt)))
    .orderBy(desc(tenants.createdAt))
    .limit(limit);
}
