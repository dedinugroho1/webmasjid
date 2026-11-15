"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";

export type PasswordState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Wajib diisi"),
    newPassword: z.string().min(8, "Minimal 8 karakter").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Konfirmasi tidak sama" });

export async function changeOwnPassword(slug: string, _prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const access = await requireTenantAccess(slug);
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) return { fieldErrors: { currentPassword: ["Password saat ini salah"] } };
    throw e;
  }
  // Sesi lama dicabut & cookie baru telah di-set: navigasi ulang agar request
  // berikutnya memakai sesi baru.
  redirect(`/${slug}/admin/akun?diganti=1`);
}
