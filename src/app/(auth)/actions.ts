"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { prayerSettings, sessions, tenants, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { DEFAULT_RUNNING_TEXT } from "@/lib/constants";
import { isValidSlug } from "@/lib/reserved-slugs";
import { registrationOpen } from "@/lib/utils";

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

function safeNext(next: FormDataEntryValue | null) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

// ─── Masuk ──────────────────────────────────────────────────────────────
const signInSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let tenantId: string | null = null;
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    const [u] = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, res.user.id)).limit(1);
    tenantId = u?.tenantId ?? null;
  } catch (e) {
    if (e instanceof APIError) return { error: "Email atau password salah." };
    throw e;
  }

  const next = safeNext(formData.get("next"));
  if (next) redirect(next);
  if (tenantId) {
    const [t] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (t) redirect(`/${t.slug}/admin`);
  }
  redirect("/");
}

// ─── Daftarkan Masjid ───────────────────────────────────────────────────
const registerSchema = z.object({
  masjidName: z.string().trim().min(3, "Nama masjid minimal 3 karakter").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSlug, "Gunakan 3–60 huruf kecil/angka/tanda hubung, dan bukan kata yang dicadangkan"),
  city: z.string().min(1, "Pilih kota"),
  address: z.string().trim().max(300).optional(),
  adminName: z.string().trim().min(2, "Nama pengurus wajib diisi").max(100),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!registrationOpen()) return { error: "Pendaftaran masjid baru sedang ditutup." };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const data = parsed.data;

  const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, data.slug)).limit(1);
  if (existing) return { fieldErrors: { slug: ["Alamat ini sudah dipakai masjid lain"] } };

  const city = CITIES.find((c) => c.name === data.city) ?? DEFAULT_CITY;

  // 1) Buat tenant terlebih dahulu (slug terkunci oleh unique index).
  let tenantId: string;
  try {
    const [t] = await db
      .insert(tenants)
      .values({
        name: data.masjidName,
        slug: data.slug,
        address: data.address || null,
        city: city.name,
        latitude: city.latitude,
        longitude: city.longitude,
        timezone: city.timezone,
        email: data.email,
        runningText: DEFAULT_RUNNING_TEXT,
      })
      .returning({ id: tenants.id });
    tenantId = t.id;
  } catch {
    return { fieldErrors: { slug: ["Alamat ini sudah dipakai masjid lain"] } };
  }

  // 2) Buat akun admin via Better Auth (otomatis login).
  let userId: string;
  try {
    const res = await auth.api.signUpEmail({
      body: { name: data.adminName, email: data.email, password: data.password },
      headers: await headers(),
    });
    userId = res.user.id;
  } catch (e) {
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    if (e instanceof APIError) {
      return { error: e.body?.code === "USER_ALREADY_EXISTS" ? "Email sudah terdaftar. Silakan masuk." : e.message };
    }
    throw e;
  }

  // 3) Ikat user & sesinya ke tenant (transaksi — didukung driver neon-serverless).
  await db.transaction(async (tx) => {
    await tx.update(users).set({ tenantId, role: "DKM_ADMIN" }).where(eq(users.id, userId));
    await tx.update(sessions).set({ tenantId }).where(eq(sessions.userId, userId));
    await tx.insert(prayerSettings).values({ tenantId, calculationMethod: "KEMENAG", iqomahOffsetMinutes: 10 });
  });

  redirect(`/${data.slug}/admin?welcome=1`);
}
