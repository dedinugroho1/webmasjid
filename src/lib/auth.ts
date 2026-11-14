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

export const auth = betterAuth({
  appName: "WebMasjid",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
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
  // nextCookies() memastikan cookie sesi ter-set saat auth.api dipanggil dari Server Action.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
