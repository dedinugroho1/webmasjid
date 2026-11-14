/**
 * Konfigurasi Better Auth (server).
 *
 * - Adapter Drizzle → tabel users/sessions/accounts/verifications.
 * - `user.tenantId` & `user.role` sebagai additionalFields (tidak bisa diisi
 *   dari client: `input: false`).
 * - `session.tenantId` diisi otomatis lewat database hook saat sesi dibuat,
 *   sehingga setiap sesi terikat pada satu masjid (tenant).
 * - Otorisasi per-tenant dilakukan di `src/lib/session.ts`.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { sendEmail } from "./email";
import { consume } from "./rate-limit";
import { appUrl, trustedOrigins } from "./utils";

export const auth = betterAuth({
  appName: "WebMasjid",
  baseURL: process.env.BETTER_AUTH_URL || appUrl(),
  // Mengizinkan URL deployment/branch Vercel (preview) selain URL utama.
  trustedOrigins: trustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 jam
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Atur ulang password WebMasjid",
        text: [
          `Assalamu'alaikum ${user.name},`,
          "",
          "Kami menerima permintaan untuk mengatur ulang password akun pengurus WebMasjid Anda.",
          `Buka tautan berikut (berlaku 1 jam): ${url}`,
          "",
          "Abaikan email ini bila Anda tidak memintanya.",
        ].join("\n"),
      });
    },
  },
  user: {
    additionalFields: {
      tenantId: { type: "string", required: false, input: false },
      role: { type: "string", required: false, defaultValue: "DKM_ADMIN", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 hari
    updateAge: 60 * 60 * 24, // perpanjang tiap 1 hari
    additionalFields: {
      tenantId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Ikat sesi baru dengan tenant milik user.
        before: async (session) => {
          const [u] = await db
            .select({ tenantId: users.tenantId })
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);
          return { data: { ...session, tenantId: u?.tenantId ?? null } };
        },
      },
    },
  },
  // Batas percobaan untuk request langsung ke /api/auth/* (disimpan di DB agar
  // berlaku lintas instance serverless). Server action memakai checkLimits().
  rateLimit: {
    enabled: process.env.RATE_LIMIT_DISABLED !== "true",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 60, max: 10 },
      "/change-password": { window: 15 * 60, max: 10 },
    },
    customStorage: { consume: (key, rule) => consume(`ba:${key}`, rule) },
  },
  // nextCookies() memastikan cookie sesi ter-set saat auth.api dipanggil dari Server Action.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
