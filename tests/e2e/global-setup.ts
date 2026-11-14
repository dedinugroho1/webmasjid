import "dotenv/config";
import pg from "pg";

/**
 * Kosongkan penghitung rate limit sebelum tes, agar run berulang (lokal) tidak
 * terkunci oleh percobaan login dari run sebelumnya.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) return;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("delete from rate_limits");
  } finally {
    await client.end();
  }
}
