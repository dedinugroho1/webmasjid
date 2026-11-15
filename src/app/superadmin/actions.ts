"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/db";
import { accounts, sessions, tenants, users } from "@/db/schema";
import { isValidSlug } from "@/lib/reserved-slugs";
import { setPlatformSetting } from "@/lib/platform-settings";
import { requireSuperadmin } from "@/lib/session";
import { generateTempPassword } from "@/lib/tokens";

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

export async function approveTenant(tenantId: string) {
  await requireSuperadmin();
  const [t] = await db
    .update(tenants)
    .set({ approvedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning({ slug: tenants.slug });
  refresh(t ? [t.slug] : []);
}

/** Buka/tutup pendaftaran masjid baru (menggantikan NEXT_PUBLIC_ALLOW_REGISTRATION). */
export async function setRegistrationOpen(open: boolean) {
  await requireSuperadmin();
  await setPlatformSetting("registration_open", open);
  revalidatePath("/superadmin");
  revalidatePath("/daftar");
}

/** Aktif: masjid baru menunggu persetujuan sebelum tampil di direktori. */
export async function setModerationEnabled(enabled: boolean) {
  await requireSuperadmin();
  await setPlatformSetting("moderation_enabled", enabled);
  revalidatePath("/superadmin");
  revalidatePath("/daftar");
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

// ─── Manajemen akun pengguna ────────────────────────────────────────────
export type UserActionResult = { ok: true } | { ok: false; error: string };
export type UserResetResult = { ok: true; password: string } | { ok: false; error: string };

const SELF_ERROR = "Tidak bisa mengubah akun Anda sendiri dari sini.";

/** Password sementara untuk pengguna mana pun; semua sesinya dicabut. */
export async function resetUserPassword(userId: string): Promise<UserResetResult> {
  const me = await requireSuperadmin();
  if (me.id === userId) return { ok: false, error: SELF_ERROR };
  const password = generateTempPassword();
  const hashed = await hashPassword(password);
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(accounts)
      .set({ password: hashed })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
      .returning({ id: accounts.id });
    if (rows.length) await tx.delete(sessions).where(eq(sessions.userId, userId));
    return rows.length;
  });
  if (!updated) return { ok: false, error: "Akun ini tidak memakai login email & password." };
  revalidatePath("/superadmin/pengguna");
  return { ok: true, password };
}

export async function setUserRole(userId: string, role: string): Promise<UserActionResult> {
  const me = await requireSuperadmin();
  if (me.id === userId) return { ok: false, error: SELF_ERROR };
  const parsed = z.enum(["SUPERADMIN", "DKM_ADMIN", "BENDAHARA"]).safeParse(role);
  if (!parsed.success) return { ok: false, error: "Peran tidak valid." };
  const updated = await db.update(users).set({ role: parsed.data }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!updated.length) return { ok: false, error: "Pengguna tidak ditemukan." };
  revalidatePath("/superadmin/pengguna");
  return { ok: true };
}

/** Hapus akun beserta sesi dan kredensialnya. Catatan yang pernah dibuatnya tetap ada (pelaku dikosongkan). */
export async function deleteUser(userId: string): Promise<UserActionResult> {
  const me = await requireSuperadmin();
  if (me.id === userId) return { ok: false, error: SELF_ERROR };
  const removed = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  if (!removed.length) return { ok: false, error: "Pengguna tidak ditemukan." };
  revalidatePath("/superadmin/pengguna");
  revalidatePath("/superadmin");
  return { ok: true };
}
