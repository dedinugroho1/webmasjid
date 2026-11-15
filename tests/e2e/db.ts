import "../../scripts/load-env";
import pg from "pg";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/** Jalankan satu query ke database tes (driver mengikuti DATABASE_DRIVER). */
export async function testQuery(sql: string, params: unknown[] = []) {
  if (!process.env.DATABASE_URL) return;
  if (process.env.DATABASE_DRIVER === "neon") {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(sql, params);
    } finally {
      await pool.end();
    }
    return;
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}

/** Kosongkan penghitung rate limit (semua, atau yang key-nya cocok dengan pola LIKE). */
export function clearRateLimits(likePattern = "%") {
  return testQuery("delete from rate_limits where key like $1", [likePattern]);
}
