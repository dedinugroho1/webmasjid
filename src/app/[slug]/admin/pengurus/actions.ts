"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { accounts, invitations, sessions, users } from "@/db/schema";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";
import { recordAudit } from "@/lib/audit-log";
import { ROLE_LABELS } from "@/lib/constants";
import { generateTempPassword, generateToken, hashToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";

const INVITE_TTL_DAYS = 7;
const MANAGEABLE_ROLES = ["DKM_ADMIN", "BENDAHARA"] as const;

export type InviteState = { ok?: boolean; url?: string; error?: string } | null;
export type ResetResult = { ok: true; password: string } | { ok: false; error: string };

/** Pastikan `userId` adalah pengurus masjid ini & bukan diri sendiri. */
async function getManagedMember(tenantId: string, actorId: string, userId: string) {
  if (userId === actorId) return { error: "Tidak bisa mengubah akun Anda sendiri dari sini." } as const;
  const [member] = await db
    .select({ id: users.id, role: users.role, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);
  if (!member || member.role === "SUPERADMIN") return { error: "Pengurus tidak ditemukan." } as const;
  return { member } as const;
}

// ─── Undangan ───────────────────────────────────────────────────────────
const inviteSchema = z.object({
  role: z.enum(MANAGEABLE_ROLES),
  note: z.string().trim().max(100).optional(),
});

export async function createInvitation(slug: string, _prev: InviteState, formData: FormData): Promise<InviteState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = inviteSchema.safeParse({ role: formData.get("role"), note: formData.get("note") || undefined });
  if (!parsed.success) return { error: "Data undangan tidak valid." };

  const token = generateToken();
  await db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(invitations)
      .values({
        tenantId: tenant.id,
        role: parsed.data.role,
        note: parsed.data.note ?? null,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        createdBy: user.id,
      })
      .returning({ id: invitations.id });
    await recordAudit(tx, {
      tenantId: tenant.id,
      entity: "member",
      entityId: inv.id,
      action: "INVITE",
      actor: user,
      summary: `Membuat undangan ${ROLE_LABELS[parsed.data.role]}${parsed.data.note ? ` (${parsed.data.note})` : ""}`,
    });
  });

  revalidatePath(`/${slug}/admin/pengurus`);
  return { ok: true, url: `${appUrl()}/undangan/${token}` };
}

export async function revokeInvitation(slug: string, id: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return;
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenant.id), isNull(invitations.acceptedAt)));
  revalidatePath(`/${slug}/admin/pengurus`);
}

// ─── Kelola anggota ─────────────────────────────────────────────────────
export async function updateMemberRole(slug: string, userId: string, role: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return;
  const parsedRole = z.enum(MANAGEABLE_ROLES).safeParse(role);
  if (!parsedRole.success) return;
  const res = await getManagedMember(tenant.id, user.id, userId);
  if ("error" in res) return;
  if (res.member.role === parsedRole.data) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role: parsedRole.data }).where(eq(users.id, userId));
    await recordAudit(tx, {
      tenantId: tenant.id,
      entity: "member",
      entityId: userId,
      action: "ROLE",
      actor: user,
      summary: `Mengubah peran ${res.member.name} dari ${ROLE_LABELS[res.member.role]} menjadi ${ROLE_LABELS[parsedRole.data]}`,
      before: { role: res.member.role },
      after: { role: parsedRole.data },
    });
  });
  revalidatePath(`/${slug}/admin/pengurus`);
}

export async function removeMember(slug: string, userId: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return;
  const res = await getManagedMember(tenant.id, user.id, userId);
  if ("error" in res) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ tenantId: null }).where(eq(users.id, userId));
    // Paksa keluar dari semua perangkat.
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await recordAudit(tx, {
      tenantId: tenant.id,
      entity: "member",
      entityId: userId,
      action: "REMOVE",
      actor: user,
      summary: `Mengeluarkan ${res.member.name} (${res.member.email}) dari pengurus`,
    });
  });
  revalidatePath(`/${slug}/admin/pengurus`);
}

/**
 * Atur password sementara untuk pengurus (dipakai bila email belum
 * dikonfigurasi). Semua sesi pengurus tersebut dicabut.
 */
export async function resetMemberPassword(slug: string, userId: string): Promise<ResetResult> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return { ok: false, error: DEMO_READONLY_MESSAGE };
  const res = await getManagedMember(tenant.id, user.id, userId);
  if ("error" in res) return { ok: false, error: res.error ?? "Gagal" };

  const password = generateTempPassword();
  const hashed = await hashPassword(password);
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(accounts)
      .set({ password: hashed })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
      .returning({ id: accounts.id });
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    if (rows.length) {
      await recordAudit(tx, {
        tenantId: tenant.id,
        entity: "member",
        entityId: userId,
        action: "PASSWORD_RESET",
        actor: user,
        summary: `Membuat password sementara untuk ${res.member.name} (${res.member.email})`,
      });
    }
    return rows.length;
  });
  if (!updated) return { ok: false, error: "Akun ini tidak memakai login email & password." };
  return { ok: true, password };
}
