"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { isValidSlug } from "@/lib/reserved-slugs";
import { requireSuperadmin } from "@/lib/session";

export type SlugState = { ok?: boolean; error?: string } | null;

function refresh(slugs: string[] = []) {
  revalidatePath("/superadmin");
  revalidatePath("/");
  for (const s of slugs) revalidatePath(`/${s}`, "layout");
}

export async function setPublished(tenantId: string, published: boolean) {
  await requireSuperadmin();
  const [t] = await db.update(tenants).set({ isPublished: published }).where(eq(tenants.id, tenantId)).returning({ slug: tenants.slug });
  refresh(t ? [t.slug] : []);
}

export async function suspendTenant(tenantId: string, reason: string) {
  await requireSuperadmin();
  const [t] = await db
    .update(tenants)
    .set({ suspendedAt: new Date(), suspendReason: reason.trim().slice(0, 300) || null })
    .where(eq(tenants.id, tenantId))
    .returning({ slug: tenants.slug });
  refresh(t ? [t.slug] : []);
}

export async function unsuspendTenant(tenantId: string) {
  await requireSuperadmin();
  const [t] = await db
    .update(tenants)
    .set({ suspendedAt: null, suspendReason: null })
    .where(eq(tenants.id, tenantId))
    .returning({ slug: tenants.slug });
  refresh(t ? [t.slug] : []);
}

export async function changeSlug(tenantId: string, _prev: SlugState, formData: FormData): Promise<SlugState> {
  await requireSuperadmin();
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSlug, "Slug tidak valid atau dicadangkan")
    .safeParse(formData.get("slug"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const [current] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!current) return { error: "Masjid tidak ditemukan" };
  if (current.slug === parsed.data) return { ok: true };

  try {
    await db.update(tenants).set({ slug: parsed.data }).where(eq(tenants.id, tenantId));
  } catch {
    return { error: "Slug sudah dipakai masjid lain" };
  }
  refresh([current.slug, parsed.data]);
  return { ok: true };
}
