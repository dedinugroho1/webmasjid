/**
 * Mode demo: masjid dengan `is_demo = true` bisa dijelajahi siapa saja
 * memakai akun demo, tetapi semua perubahan ditolak agar demo tetap rapi
 * (dan password akun demo tidak bisa diganti orang lain).
 * Superadmin tetap bisa mengubah masjid demo.
 */
import type { UserRole } from "@/db/schema";

/** Akun demo bawaan (sama dengan scripts/seed.ts). */
export const DEMO_ACCOUNT = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@webmasjid.test",
  password: process.env.SEED_ADMIN_PASSWORD ?? "demo12345",
};

export const DEMO_READONLY_MESSAGE =
  "Mode demo: perubahan tidak disimpan. Daftarkan masjid Anda untuk mencoba sepenuhnya.";

/** True bila perubahan harus ditolak karena masjid ini masjid demo. */
export function isReadOnlyDemo(access: { tenant: { isDemo: boolean }; user: { role: UserRole } }) {
  return access.tenant.isDemo && access.user.role !== "SUPERADMIN";
}
