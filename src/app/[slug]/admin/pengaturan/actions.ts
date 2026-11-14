"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prayerSettings, tenants, type BankAccount } from "@/db/schema";
import { TIMEZONES } from "@/lib/constants";
import { CALCULATION_METHODS } from "@/lib/prayer";
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
  iqomahOffsetMinutes: z.coerce.number().int().min(0).max(60),
  runningText: optionalText(2000),
  bankAccounts: z.string().max(2000).optional(),
  isPublished: z.literal("on").optional(),
});

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
        runningText: d.runningText,
        bankAccounts: parseBankAccounts(d.bankAccounts),
        isPublished: d.isPublished === "on",
        ...images,
      })
      .where(eq(tenants.id, tenant.id));

    await tx
      .insert(prayerSettings)
      .values({ tenantId: tenant.id, calculationMethod: d.calculationMethod, iqomahOffsetMinutes: d.iqomahOffsetMinutes })
      .onConflictDoUpdate({
        target: prayerSettings.tenantId,
        set: { calculationMethod: d.calculationMethod, iqomahOffsetMinutes: d.iqomahOffsetMinutes },
      });
  });

  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}
