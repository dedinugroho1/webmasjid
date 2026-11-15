"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { invitations, sessions, tenants, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { checkLimits, clientIp, LIMITS } from "@/lib/rate-limit";
import { isDisposableEmail, looksLikeSpamText } from "@/lib/spam";
import { hashToken } from "@/lib/tokens";
import type { FormState } from "../../actions";

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Nama wajib diisi").max(100),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
  consent: z.literal("on", "Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi"),
});

/** Klaim undangan secara atomik (sekali pakai). */
async function claim(token: string) {
  const [inv] = await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(and(eq(invitations.tokenHash, hashToken(token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())))
    .returning();
  return inv ?? null;
}

async function release(id: string) {
  await db.update(invitations).set({ acceptedAt: null }).where(eq(invitations.id, id));
}

async function bind(inv: { id: string; tenantId: string; role: "DKM_ADMIN" | "BENDAHARA" | "SUPERADMIN" }, userId: string) {
  await db.transaction(async (tx) => {
    await tx.update(users).set({ tenantId: inv.tenantId, role: inv.role }).where(eq(users.id, userId));
    await tx.update(sessions).set({ tenantId: inv.tenantId }).where(eq(sessions.userId, userId));
    await tx.update(invitations).set({ acceptedBy: userId }).where(eq(invitations.id, inv.id));
  });
  const [t] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, inv.tenantId)).limit(1);
  return t.slug;
}

export async function acceptInvitation(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const limited = await checkLimits([{ key: `invite:ip:${await clientIp()}`, rule: LIMITS.invitePerIp }]);
  if (limited) return { error: limited };

  const session = await auth.api.getSession({ headers: await headers() });

  // Sudah login: gabungkan akun yang belum terikat masjid mana pun.
  if (session) {
    if (session.user.tenantId) return { error: "Akun Anda sudah menjadi pengurus masjid lain. Keluar dulu, lalu buat akun baru." };
    const inv = await claim(token);
    if (!inv) return { error: "Undangan tidak valid, sudah dipakai, atau kedaluwarsa." };
    redirect(`/${await bind(inv, session.user.id)}/admin`);
  }

  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (isDisposableEmail(parsed.data.email)) {
    return { fieldErrors: { email: ["Gunakan email aktif (bukan email sementara/sekali pakai)"] } };
  }
  if (looksLikeSpamText(parsed.data.name)) return { fieldErrors: { name: ["Nama tidak valid"] } };

  const inv = await claim(token);
  if (!inv) return { error: "Undangan tidak valid, sudah dipakai, atau kedaluwarsa." };

  let userId: string;
  try {
    const res = await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
    userId = res.user.id;
  } catch (e) {
    await release(inv.id);
    if (e instanceof APIError) {
      return { error: e.body?.code === "USER_ALREADY_EXISTS" ? "Email sudah terdaftar. Gunakan email lain." : e.message };
    }
    throw e;
  }

  redirect(`/${await bind(inv, userId)}/admin`);
}
