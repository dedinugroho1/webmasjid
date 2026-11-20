"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prayerSettings, tenants } from "@/db/schema";
import { TIMEZONES } from "@/lib/constants";
import { validateCustomDomain } from "@/lib/domains";
import { CALCULATION_METHODS } from "@/lib/prayer";
import { parseBankAccounts, parsePrayerTuning } from "@/lib/settings-parse";
import { deleteTenantCompletely } from "@/lib/tenant-delete";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";
import { deleteImage, uploadImage } from "@/lib/storage";

export type SettingsFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const settingsSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: optionalText(500),
  address: optionalText(300),
  phone: optionalText(30),
  email: z
    .union([z.email("Email tidak valid"), z.literal("")])
    .optional()
    .transform((v) => v || null),
  city: optionalText(80),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  timezone: z.enum(TIMEZONES.map((t) => t.value) as [string, ...string[]]),
  calculationMethod: z.enum(Object.keys(CALCULATION_METHODS) as [string, ...string[]]),
  bankAccounts: z.string().max(2000).optional(),
  isPublished: z.literal("on").optional(),
});

export async function updateSettings(slug: string, _prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const tuning = parsePrayerTuning(formData);
  if (Object.keys(tuning.errors).length) return { fieldErrors: tuning.errors };
  const domain = validateCustomDomain(String(formData.get("customDomain") ?? ""));
  if (!domain.ok) return { fieldErrors: { customDomain: [domain.error] } };

  const images: Partial<Record<"logoUrl" | "qrisUrl" | "coverUrl", string | null>> = {};
  try {
    for (const [field, key] of [
      ["logo", "logoUrl"],
      ["qris", "qrisUrl"],
      ["cover", "coverUrl"],
    ] as const) {
      if (formData.get(`remove_${field}`) === "on") images[key] = null;
      const url = await uploadImage(formData.get(field), `${tenant.id}/${field}`);
      if (url) images[key] = url;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Foto yang baru diunggah (bukan penghapusan): dibersihkan bila penyimpanan gagal.
  const newUploads = Object.values(images).filter((u): u is string => Boolean(u));

  if (domain.domain) {
    const [taken] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.customDomain, domain.domain)).limit(1);
    if (taken && taken.id !== tenant.id) {
      await Promise.all(newUploads.map(deleteImage));
      return { fieldErrors: { customDomain: ["Domain ini sudah dipakai masjid lain."] } };
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(tenants)
        .set({
          name: d.name,
          description: d.description,
          address: d.address,
          phone: d.phone,
          email: d.email,
          city: d.city,
          latitude: d.latitude,
          longitude: d.longitude,
          timezone: d.timezone,
          bankAccounts: parseBankAccounts(d.bankAccounts),
          isPublished: d.isPublished === "on",
          customDomain: domain.domain,
          ...images,
        })
        .where(eq(tenants.id, tenant.id));

      await tx
        .insert(prayerSettings)
        .values({
          tenantId: tenant.id,
          calculationMethod: d.calculationMethod,
          adjustments: tuning.adjustments,
          iqomahMinutes: tuning.iqomahMinutes,
        })
        .onConflictDoUpdate({
          target: prayerSettings.tenantId,
          set: { calculationMethod: d.calculationMethod, adjustments: tuning.adjustments, iqomahMinutes: tuning.iqomahMinutes },
        });
    });
  } catch (e) {
    await Promise.all(newUploads.map(deleteImage));
    throw e;
  }

  // Foto lama yang diganti atau dihapus dibersihkan dari penyimpanan.
  const previous = { logoUrl: tenant.logoUrl, qrisUrl: tenant.qrisUrl, coverUrl: tenant.coverUrl };
  await Promise.all(
    (Object.keys(images) as (keyof typeof images)[])
      .filter((key) => previous[key] && previous[key] !== images[key])
      .map((key) => deleteImage(previous[key])),
  );

  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export type DeleteMasjidState = { error?: string } | null;

/** Hapus masjid & seluruh datanya. Admin harus mengetik alamat masjid (slug) sebagai konfirmasi. */
export async function deleteMasjid(slug: string, _prev: DeleteMasjidState, formData: FormData): Promise<DeleteMasjidState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  if (tenant.isDemo) return { error: "Masjid demo tidak dapat dihapus." };

  if (String(formData.get("confirm") ?? "").trim() !== tenant.slug) {
    return { error: `Ketik persis "${tenant.slug}" untuk mengonfirmasi penghapusan.` };
  }

  const result = await deleteTenantCompletely(tenant.id, {
    action: "TENANT_DELETE",
    actor: access.user,
    target: { type: "tenant", id: tenant.id, label: `${tenant.name} (/${tenant.slug})` },
    summary: `Masjid ${tenant.name} (/${tenant.slug}) dihapus oleh admin DKM-nya sendiri`,
    details: { slug: tenant.slug, by: "DKM_ADMIN" },
  });
  if (!result.storageCleaned) console.error(`[hapus-masjid] Foto ${tenant.id} di penyimpanan belum terhapus`);
  revalidatePath("/", "layout");
  redirect("/masuk?dihapus=1");
}
