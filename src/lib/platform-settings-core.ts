/** Logika murni pengaturan platform (tanpa akses database, mudah diuji). */

export type SettingKey = "registration_open" | "moderation_enabled";

export type PlatformSettings = {
  /** Pendaftaran masjid baru dibuka. */
  registrationOpen: boolean;
  /** Masjid baru harus disetujui superadmin sebelum tampil di direktori. */
  moderationEnabled: boolean;
};

export function resolvePlatformSettings(
  rows: { key: string; value: unknown }[],
  defaults: { registrationOpen: boolean },
): PlatformSettings {
  const get = (key: SettingKey) => rows.find((r) => r.key === key)?.value;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    registrationOpen: bool(get("registration_open"), defaults.registrationOpen),
    moderationEnabled: bool(get("moderation_enabled"), false),
  };
}
