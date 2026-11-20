"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { prayerSettings, sessions, tenants, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import { DEFAULT_RUNNING_TEXT } from "@/lib/constants";
import { checkLimits, clientIp, LIMITS } from "@/lib/rate-limit";
import { isValidSlug } from "@/lib/reserved-slugs";
import { isDisposableEmail, looksLikeSpamText, verifyFormToken } from "@/lib/spam";
import { getPlatformSettings } from "@/lib/platform-settings";
import { notifyNewRegistration } from "@/lib/admin-notify";

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

  const ip = await clientIp();
  const limited = await checkLimits([
    { key: `signin:ip:${ip}`, rule: LIMITS.signInPerIp },
    { key: `signin:email:${parsed.data.email.toLowerCase()}`, rule: LIMITS.signInPerEmail },
  ]);
  if (limited) return { error: limited };

  let tenantId: string | null = null;
  let role: string | null = null;
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    const [u] = await db
      .select({ tenantId: users.tenantId, role: users.role })
      .from(users)
      .where(eq(users.id, res.user.id))
      .limit(1);
    tenantId = u?.tenantId ?? null;
    role = u?.role ?? null;
  } catch (e) {
    if (e instanceof APIError) return { error: "Email atau password salah." };
    throw e;
  }

  const next = safeNext(formData.get("next"));
  if (next) redirect(next);
  if (role === "SUPERADMIN") redirect("/superadmin");
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
  consent: z.literal("on", "Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi"),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const settings = await getPlatformSettings();
  if (!settings.registrationOpen) return { error: "Pendaftaran masjid baru sedang ditutup." };
  // Honeypot: kolom tersembunyi yang hanya diisi bot.
  if (formData.get("website")) return { error: "Pendaftaran gagal. Silakan coba lagi." };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const data = parsed.data;

  // Pemeriksaan ringan anti-spam.
  const timing = verifyFormToken(formData.get("formToken"));
  if (!timing.ok) {
    return {
      error:
        timing.reason === "too-fast"
          ? "Formulir dikirim terlalu cepat. Periksa kembali isian Anda, lalu kirim ulang."
          : "Sesi formulir sudah kedaluwarsa. Muat ulang halaman, lalu coba lagi.",
    };
  }
  if (isDisposableEmail(data.email)) {
    return { fieldErrors: { email: ["Gunakan email aktif (bukan email sementara/sekali pakai)"] } };
  }
  const spamFields: Record<string, string[] | undefined> = {};
  if (looksLikeSpamText(data.masjidName)) spamFields.masjidName = ["Nama masjid tidak boleh berisi tautan atau promosi"];
  if (looksLikeSpamText(data.adminName)) spamFields.adminName = ["Nama pengurus tidak valid"];
  if (data.address && /https?:\/\/|www\./i.test(data.address)) spamFields.address = ["Alamat tidak boleh berisi tautan"];
  if (Object.keys(spamFields).length) return { fieldErrors: spamFields };

  const limited = await checkLimits([{ key: `register:ip:${await clientIp()}`, rule: LIMITS.registerPerIp }]);
  if (limited) return { error: limited };

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
        // Dengan moderasi aktif, masjid baru menunggu persetujuan superadmin.
        approvedAt: settings.moderationEnabled ? null : new Date(),
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

  // Kabari pengelola platform setelah respons terkirim (tidak memperlambat pendaftar).
  after(() =>
    notifyNewRegistration({
      masjidName: data.masjidName,
      slug: data.slug,
      city: city.name,
      adminName: data.adminName,
      adminEmail: data.email,
      needsApproval: settings.moderationEnabled,
    }),
  );

  redirect(`/${data.slug}/admin?welcome=1`);
}

// ─── Lupa & reset password ──────────────────────────────────────────────
export type ResetRequestState = { sent?: boolean; fieldErrors?: Record<string, string[] | undefined> } | null;

export async function requestResetAction(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const parsed = z.object({ email: z.email("Email tidak valid") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const limited = await checkLimits([
    { key: `reset:ip:${await clientIp()}`, rule: LIMITS.resetPerIp },
    { key: `reset:email:${parsed.data.email.toLowerCase()}`, rule: LIMITS.resetPerEmail },
  ]);
  // Tetap tampilkan pesan generik agar tidak membocorkan status email.
  if (limited) return { sent: true };
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/reset-password" },
      headers: await headers(),
    });
  } catch (e) {
    // Jangan bocorkan apakah email terdaftar.
    if (!(e instanceof APIError)) throw e;
  }
  return { sent: true };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "Password minimal 8 karakter").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Konfirmasi tidak sama" });

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await auth.api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.newPassword },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) return { error: "Link reset tidak valid atau kedaluwarsa. Silakan minta link baru." };
    throw e;
  }
  redirect("/masuk?reset=1");
}
