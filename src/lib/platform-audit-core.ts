/**
 * Logika murni riwayat tindakan pengelola platform: label aksi dan penyamaran
 * email agar catatan yang tersimpan lama tidak membuka data pribadi utuh.
 */
import type { PlatformAuditAction } from "@/db/schema";

export const PLATFORM_ACTION_LABELS: Record<PlatformAuditAction, string> = {
  TENANT_APPROVE: "Masjid disetujui",
  TENANT_REJECT: "Pendaftaran ditolak",
  TENANT_SUSPEND: "Masjid ditangguhkan",
  TENANT_RESTORE: "Masjid dipulihkan",
  TENANT_PUBLISH: "Masjid ditampilkan",
  TENANT_HIDE: "Masjid disembunyikan",
  TENANT_SLUG: "Slug diubah",
  TENANT_DELETE: "Masjid dihapus",
  SETTING_REGISTRATION: "Pendaftaran publik",
  SETTING_MODERATION: "Moderasi pendaftaran",
  USER_ROLE: "Peran diubah",
  USER_PASSWORD_RESET: "Password direset",
  USER_DELETE: "Akun dihapus",
};

export type PlatformActionGroup = "tenant" | "user" | "setting";

export const PLATFORM_GROUP_LABELS: Record<PlatformActionGroup, string> = {
  tenant: "Masjid",
  user: "Pengguna",
  setting: "Pengaturan",
};

export function actionGroup(action: PlatformAuditAction): PlatformActionGroup {
  if (action.startsWith("TENANT_")) return "tenant";
  if (action.startsWith("USER_")) return "user";
  return "setting";
}

export function parsePlatformGroup(value: string | undefined): PlatformActionGroup | null {
  return value === "tenant" || value === "user" || value === "setting" ? value : null;
}

export function actionsInGroup(group: PlatformActionGroup): PlatformAuditAction[] {
  return (Object.keys(PLATFORM_ACTION_LABELS) as PlatformAuditAction[]).filter((a) => actionGroup(a) === group);
}

/**
 * Samarkan email: "ahmad.fauzi@gmail.com" → "ah***@gmail.com".
 * Nilai yang bukan email dikembalikan apa adanya; kosong → null.
 */
export function maskEmail(email: string | null | undefined): string | null {
  const value = email?.trim();
  if (!value) return null;
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return value;
  const local = value.slice(0, at);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***${value.slice(at)}`;
}

/** Label pengguna yang aman disimpan lama: "Ahmad (ah***@gmail.com)". */
export function userLabel(user: { name: string; email: string }) {
  const masked = maskEmail(user.email);
  return masked ? `${user.name} (${masked})` : user.name;
}
