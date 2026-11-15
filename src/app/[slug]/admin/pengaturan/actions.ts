"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prayerSettings, tenants } from "@/db/schema";
import { TIMEZONES } from "@/lib/constants";
import { validateCustomDomain } from "@/lib/domains";
import { CALCULATION_METHODS } from "@/lib/prayer";
import { parseBankAccounts, parsePrayerTuning } from "@/lib/settings-parse";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

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

  if (domain.domain) {
    const [taken] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.customDomain, domain.domain)).limit(1);
    if (taken && taken.id !== tenant.id) return { fieldErrors: { customDomain: ["Domain ini sudah dipakai masjid lain."] } };
  }

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

  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}
