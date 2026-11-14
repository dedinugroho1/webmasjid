"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { accounts, invitations, sessions, users } from "@/db/schema";
import { requireTenantAccess } from "@/lib/session";
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
    .select({ id: users.id, role: users.role })
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
  const { tenant, user } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const parsed = inviteSchema.safeParse({ role: formData.get("role"), note: formData.get("note") || undefined });
  if (!parsed.success) return { error: "Data undangan tidak valid." };

  const token = generateToken();
  await db.insert(invitations).values({
    tenantId: tenant.id,
    role: parsed.data.role,
    note: parsed.data.note ?? null,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    createdBy: user.id,
  });

  revalidatePath(`/${slug}/admin/pengurus`);
  return { ok: true, url: `${appUrl()}/undangan/${token}` };
}

export async function revokeInvitation(slug: string, id: string) {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenant.id), isNull(invitations.acceptedAt)));
  revalidatePath(`/${slug}/admin/pengurus`);
}

// ─── Kelola anggota ─────────────────────────────────────────────────────
export async function updateMemberRole(slug: string, userId: string, role: string) {
  const { tenant, user } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const parsedRole = z.enum(MANAGEABLE_ROLES).safeParse(role);
  if (!parsedRole.success) return;
  const res = await getManagedMember(tenant.id, user.id, userId);
  if ("error" in res) return;
  await db.update(users).set({ role: parsedRole.data }).where(eq(users.id, userId));
  revalidatePath(`/${slug}/admin/pengurus`);
}

export async function removeMember(slug: string, userId: string) {
  const { tenant, user } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const res = await getManagedMember(tenant.id, user.id, userId);
  if ("error" in res) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ tenantId: null }).where(eq(users.id, userId));
    // Paksa keluar dari semua perangkat.
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });
  revalidatePath(`/${slug}/admin/pengurus`);
}

/**
 * Atur password sementara untuk pengurus (dipakai bila email belum
 * dikonfigurasi). Semua sesi pengurus tersebut dicabut.
 */
export async function resetMemberPassword(slug: string, userId: string): Promise<ResetResult> {
  const { tenant, user } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
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
    return rows.length;
  });
  if (!updated) return { ok: false, error: "Akun ini tidak memakai login email & password." };
  return { ok: true, password };
}
