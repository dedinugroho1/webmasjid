import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { resolvePlatformSettings, type PlatformSettings, type SettingKey } from "./platform-settings-core";
import { registrationOpen as registrationOpenByEnv } from "./utils";

/**
 * Pengaturan platform yang berlaku saat ini. Nilai di database (diatur
 * superadmin) mengalahkan default dari environment.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await db.select().from(platformSettings);
  return resolvePlatformSettings(rows, { registrationOpen: registrationOpenByEnv() });
}

export async function setPlatformSetting(key: SettingKey, value: boolean) {
  await db
    .insert(platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: sql`now()` } });
}
