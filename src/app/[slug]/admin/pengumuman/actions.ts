"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { localInputToDate } from "@/lib/format";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";

export type AnnouncementState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const schema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
  body: z.string().trim().min(3, "Isi pengumuman wajib diisi").max(5000),
  isPinned: z.literal("on").optional(),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Format tanggal tidak valid")
    .optional(),
});

function parse(formData: FormData) {
  return schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")));
}

export async function createAnnouncement(slug: string, _prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  await db.insert(announcements).values({
    tenantId: tenant.id,
    title: d.title,
    body: d.body,
    isPinned: d.isPinned === "on",
    expiresAt: d.expiresAt ? localInputToDate(d.expiresAt, tenant.timezone) : null,
    createdBy: user.id,
  });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export async function updateAnnouncement(
  slug: string,
  id: string,
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const updated = await db
    .update(announcements)
    .set({
      title: d.title,
      body: d.body,
      isPinned: d.isPinned === "on",
      expiresAt: d.expiresAt ? localInputToDate(d.expiresAt, tenant.timezone) : null,
    })
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenant.id)))
    .returning({ id: announcements.id });
  if (!updated.length) return { error: "Pengumuman tidak ditemukan." };
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/admin/pengumuman`);
}

export async function togglePin(slug: string, id: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return;
  await db
    .update(announcements)
    .set({ isPinned: not(announcements.isPinned) })
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenant.id)));
  revalidatePath(`/${slug}`, "layout");
}

export async function deleteAnnouncement(slug: string, id: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return;
  await db.delete(announcements).where(and(eq(announcements.id, id), eq(announcements.tenantId, tenant.id)));
  revalidatePath(`/${slug}`, "layout");
}
