"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prayerSettings, tenants, type BankAccount, type IqomahMinutes, type PrayerAdjustments } from "@/db/schema";
import { TIMEZONES } from "@/lib/constants";
import { ADJUSTABLE_PRAYERS, CALCULATION_METHODS, FARDH_PRAYERS, MAX_ADJUSTMENT } from "@/lib/prayer";
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

/** Baca koreksi per waktu (adj_subuh, …) & iqomah per waktu (iqomah_subuh, …). */
function parsePrayerTuning(formData: FormData) {
  const errors: Record<string, string[]> = {};
  const num = (name: string, min: number, max: number) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (raw === "") return 0;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors[name] = [`Isi bilangan bulat ${min} s.d. ${max}`];
      return 0;
    }
    return n;
  };
  const adjustments: PrayerAdjustments = {};
  for (const k of ADJUSTABLE_PRAYERS) {
    const v = num(`adj_${k}`, -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
    if (v) adjustments[k as keyof PrayerAdjustments] = v;
  }
  const iqomahMinutes: IqomahMinutes = {};
  for (const k of FARDH_PRAYERS) {
    iqomahMinutes[k as keyof IqomahMinutes] = num(`iqomah_${k}`, 0, 60);
  }
  return { adjustments, iqomahMinutes, errors };
}

/** Format per baris: "Bank | Nomor Rekening | Atas Nama". */
function parseBankAccounts(input?: string): BankAccount[] {
  return (input ?? "")
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter((p) => p.length >= 3 && p[0] && p[1])
    .slice(0, 10)
    .map(([bank, number, holder]) => ({ bank, number, holder }));
}

export async function updateSettings(slug: string, _prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const tuning = parsePrayerTuning(formData);
  if (Object.keys(tuning.errors).length) return { fieldErrors: tuning.errors };

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
