"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/db";
import { accounts, sessions, tenants, users, type PlatformAuditAction, type Tenant } from "@/db/schema";
import { isValidSlug } from "@/lib/reserved-slugs";
import { recordPlatformAudit } from "@/lib/platform-audit";
import { userLabel } from "@/lib/platform-audit-core";
import { setPlatformSetting } from "@/lib/platform-settings";
import { requireSuperadmin } from "@/lib/session";
import { generateTempPassword } from "@/lib/tokens";

export type SlugState = { ok?: boolean; error?: string } | null;
type Actor = Awaited<ReturnType<typeof requireSuperadmin>>;

function refresh(slugs: string[] = []) {
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/riwayat");
  revalidatePath("/");
  for (const s of slugs) revalidatePath(`/${s}`, "layout");
}

const tenantLabel = (t: { name: string; slug: string }) => `${t.name} (/${t.slug})`;
const cleanReason = (reason: string) => reason.trim().slice(0, 300) || null;

/**
 * Ubah satu masjid dan catat jejaknya dalam satu transaksi.
 * `summary` menerima nama masjid agar kalimatnya enak dibaca.
 */
async function updateTenant(
  actor: Actor,
  tenantId: string,
  set: Partial<Pick<Tenant, "isPublished" | "approvedAt" | "suspendedAt" | "suspendReason">>,
  action: PlatformAuditAction,
  summary: (label: string) => string,
  details?: Record<string, unknown>,
) {
  const t = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(tenants)
      .set(set)
      .where(eq(tenants.id, tenantId))
      .returning({ id: tenants.id, name: tenants.name, slug: tenants.slug });
    if (!row) return null;
    await recordPlatformAudit(tx, {
      action,
      actor,
      target: { type: "tenant", id: row.id, label: tenantLabel(row) },
      summary: summary(tenantLabel(row)),
      details,
    });
    return row;
  });
  refresh(t ? [t.slug] : []);
  return t;
}

export async function setPublished(tenantId: string, published: boolean) {
  const me = await requireSuperadmin();
  await updateTenant(
    me,
    tenantId,
    { isPublished: published },
    published ? "TENANT_PUBLISH" : "TENANT_HIDE",
    (l) => `${l} ${published ? "ditampilkan kembali di direktori" : "disembunyikan dari publik"}`,
  );
}

export async function approveTenant(tenantId: string) {
  const me = await requireSuperadmin();
  await updateTenant(me, tenantId, { approvedAt: new Date() }, "TENANT_APPROVE", (l) => `${l} disetujui`);
}

export async function suspendTenant(tenantId: string, reason: string) {
  const me = await requireSuperadmin();
  const why = cleanReason(reason);
  await updateTenant(
    me,
    tenantId,
    { suspendedAt: new Date(), suspendReason: why },
    "TENANT_SUSPEND",
    (l) => `${l} ditangguhkan${why ? `: ${why}` : ""}`,
    { reason: why },
  );
}

export async function unsuspendTenant(tenantId: string) {
  const me = await requireSuperadmin();
  await updateTenant(me, tenantId, { suspendedAt: null, suspendReason: null }, "TENANT_RESTORE", (l) => `${l} dipulihkan`);
}

// ─── Pengaturan platform ────────────────────────────────────────────────
/** Buka/tutup pendaftaran masjid baru (menggantikan NEXT_PUBLIC_ALLOW_REGISTRATION). */
export async function setRegistrationOpen(open: boolean) {
  const me = await requireSuperadmin();
  await setPlatformSetting("registration_open", open);
  await recordPlatformAudit(db, {
    action: "SETTING_REGISTRATION",
    actor: me,
    target: { type: "setting", id: "registration_open", label: "Pendaftaran publik" },
    summary: open ? "Pendaftaran masjid baru dibuka" : "Pendaftaran masjid baru ditutup",
    details: { value: open },
  });
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/riwayat");
  revalidatePath("/daftar");
}

/** Aktif: masjid baru menunggu persetujuan sebelum tampil di direktori. */
export async function setModerationEnabled(enabled: boolean) {
  const me = await requireSuperadmin();
  await setPlatformSetting("moderation_enabled", enabled);
  await recordPlatformAudit(db, {
    action: "SETTING_MODERATION",
    actor: me,
    target: { type: "setting", id: "moderation_enabled", label: "Moderasi pendaftaran" },
    summary: enabled ? "Moderasi pendaftaran diaktifkan" : "Moderasi pendaftaran dimatikan",
    details: { value: enabled },
  });
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/riwayat");
  revalidatePath("/daftar");
}

export async function changeSlug(tenantId: string, _prev: SlugState, formData: FormData): Promise<SlugState> {
  const me = await requireSuperadmin();
  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSlug, "Slug tidak valid atau dicadangkan")
    .safeParse(formData.get("slug"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const [current] = await db
    .select({ slug: tenants.slug, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!current) return { error: "Masjid tidak ditemukan" };
  if (current.slug === parsed.data) return { ok: true };

  try {
    await db.transaction(async (tx) => {
      await tx.update(tenants).set({ slug: parsed.data }).where(eq(tenants.id, tenantId));
      await recordPlatformAudit(tx, {
        action: "TENANT_SLUG",
        actor: me,
        target: { type: "tenant", id: tenantId, label: tenantLabel({ name: current.name, slug: parsed.data }) },
        summary: `Slug ${current.name} diubah dari /${current.slug} menjadi /${parsed.data}`,
        details: { from: current.slug, to: parsed.data },
      });
    });
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
const ROLE_LABELS = { SUPERADMIN: "Superadmin", DKM_ADMIN: "Admin DKM", BENDAHARA: "Bendahara" } as const;

async function findUser(userId: string) {
  const [u] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u ?? null;
}

function refreshUsers() {
  revalidatePath("/superadmin/pengguna");
  revalidatePath("/superadmin/riwayat");
}

/** Password sementara untuk pengguna mana pun; semua sesinya dicabut. */
export async function resetUserPassword(userId: string): Promise<UserResetResult> {
  const me = await requireSuperadmin();
  if (me.id === userId) return { ok: false, error: SELF_ERROR };
  const target = await findUser(userId);
  if (!target) return { ok: false, error: "Pengguna tidak ditemukan." };
  const password = generateTempPassword();
  const hashed = await hashPassword(password);
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(accounts)
      .set({ password: hashed })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
      .returning({ id: accounts.id });
    if (!rows.length) return 0;
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await recordPlatformAudit(tx, {
      action: "USER_PASSWORD_RESET",
      actor: me,
      target: { type: "user", id: userId, label: userLabel(target) },
      summary: `Password ${userLabel(target)} direset; semua sesinya dicabut`,
    });
    return rows.length;
  });
  if (!updated) return { ok: false, error: "Akun ini tidak memakai login email & password." };
  refreshUsers();
  return { ok: true, password };
}

export async function setUserRole(userId: string, role: string): Promise<UserActionResult> {
  const me = await requireSuperadmin();
  if (me.id === userId) return { ok: false, error: SELF_ERROR };
  const parsed = z.enum(["SUPERADMIN", "DKM_ADMIN", "BENDAHARA"]).safeParse(role);
  if (!parsed.success) return { ok: false, error: "Peran tidak valid." };
  const target = await findUser(userId);
  if (!target) return { ok: false, error: "Pengguna tidak ditemukan." };
  if (target.role === parsed.data) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role: parsed.data }).where(eq(users.id, userId));
    await recordPlatformAudit(tx, {
      action: "USER_ROLE",
      actor: me,
      target: { type: "user", id: userId, label: userLabel(target) },
      summary: `Peran ${userLabel(target)} diubah dari ${ROLE_LABELS[target.role]} menjadi ${ROLE_LABELS[parsed.data]}`,
      details: { from: target.role, to: parsed.data },
    });
  });
  refreshUsers();
  return { ok: true };
}

/** Hapus akun beserta sesi dan kredensialnya. Catatan yang pernah dibuatnya tetap ada (pelaku dikosongkan). */
export async function deleteUser(userId: string): Promise<UserActionResult> {
  const me = await requireSuperadmin();
  if (me.id === userId) return { ok: false, error: SELF_ERROR };
  const target = await findUser(userId);
  if (!target) return { ok: false, error: "Pengguna tidak ditemukan." };
  await db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.id, userId));
    await recordPlatformAudit(tx, {
      action: "USER_DELETE",
      actor: me,
      target: { type: "user", id: userId, label: userLabel(target) },
      summary: `Akun ${userLabel(target)} (${ROLE_LABELS[target.role]}) dihapus`,
      details: { role: target.role },
    });
  });
  refreshUsers();
  revalidatePath("/superadmin");
  return { ok: true };
}
