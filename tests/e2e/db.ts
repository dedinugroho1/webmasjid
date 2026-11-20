import "../../scripts/load-env";
import pg from "pg";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/** Jalankan satu query ke database tes (driver mengikuti DATABASE_DRIVER). */
export async function testQuery<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!process.env.DATABASE_URL) return [];
  if (process.env.DATABASE_DRIVER === "neon") {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      return (await pool.query(sql, params)).rows as T[];
    } finally {
      await pool.end();
    }
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Kosongkan penghitung rate limit (semua, atau yang key-nya cocok dengan pola LIKE). */
export function clearRateLimits(likePattern = "%") {
  return testQuery("delete from rate_limits where key like $1", [likePattern]);
}
