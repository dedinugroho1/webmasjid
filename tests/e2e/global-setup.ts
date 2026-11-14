import "../../scripts/load-env";
import pg from "pg";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Kosongkan penghitung rate limit sebelum tes, agar run berulang (lokal) tidak
 * terkunci oleh percobaan login dari run sebelumnya.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) return;
  if (process.env.DATABASE_DRIVER === "neon") {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("delete from rate_limits");
    await pool.end();
    return;
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("delete from rate_limits");
  } finally {
    await client.end();
  }
}
