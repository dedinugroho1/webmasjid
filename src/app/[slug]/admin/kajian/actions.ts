"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kajianFrequencyEnum, routineKajian } from "@/db/schema";
import { requireTenantAccess } from "@/lib/session";

export type KajianState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const optional = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => v || null);

const schema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  time: z.string().trim().min(2, "Isi waktu, mis. Ba'da Maghrib").max(60),
  title: z.string().trim().min(3, "Judul/kitab minimal 3 karakter").max(150),
  ustadz: optional,
  frequency: z.enum(kajianFrequencyEnum.enumValues),
  audience: optional,
  location: optional,
});

function parse(formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}

export async function createKajian(slug: string, _prev: KajianState, formData: FormData): Promise<KajianState> {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await db.insert(routineKajian).values({ ...parsed.data, tenantId: tenant.id });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export async function updateKajian(slug: string, id: string, _prev: KajianState, formData: FormData): Promise<KajianState> {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const updated = await db
    .update(routineKajian)
    .set(parsed.data)
    .where(and(eq(routineKajian.id, id), eq(routineKajian.tenantId, tenant.id)))
    .returning({ id: routineKajian.id });
  if (!updated.length) return { error: "Kajian tidak ditemukan." };
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/admin/kajian`);
}

export async function toggleKajian(slug: string, id: string) {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  await db
    .update(routineKajian)
    .set({ isActive: not(routineKajian.isActive) })
    .where(and(eq(routineKajian.id, id), eq(routineKajian.tenantId, tenant.id)));
  revalidatePath(`/${slug}`, "layout");
}

export async function deleteKajian(slug: string, id: string) {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  await db.delete(routineKajian).where(and(eq(routineKajian.id, id), eq(routineKajian.tenantId, tenant.id)));
  revalidatePath(`/${slug}`, "layout");
}
