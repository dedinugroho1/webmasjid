/**
 * Koneksi database + Drizzle ORM.
 *
 * Default (sesuai rekomendasi Neon untuk Vercel Fluid compute):
 * `node-postgres` (pg) ke connection string *pooled* Neon, dengan
 * `attachDatabasePool` dari @vercel/functions agar koneksi idle ditutup
 * dengan benar sebelum instance dibekukan.
 *
 * Alternatif: `DATABASE_DRIVER=neon` memakai `@neondatabase/serverless`
 * (WebSocket, mendukung transaksi) untuk runtime serverless/edge lain.
 * Skema & query identik untuk kedua driver.
 */
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import { databaseUrl } from "../lib/env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

function createDb(): Database {
  const connectionString = databaseUrl();

  if (process.env.DATABASE_DRIVER === "neon") {
    // Node.js < 22 belum punya WebSocket global; `ws` aman dipakai di semua versi.
    neonConfig.webSocketConstructor = ws;
    return drizzleNeon({ client: new NeonPool({ connectionString }), schema });
  }

  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  // Di Vercel: tutup koneksi idle sebelum fungsi disuspensi (no-op di luar Vercel).
  if (process.env.VERCEL) attachDatabasePool(pool);
  // API query & transaksi Drizzle sama untuk kedua driver.
  return drizzlePg({ client: pool, schema }) as unknown as Database;
}

// Reuse koneksi antar hot-reload di development.
const globalForDb = globalThis as unknown as { __webmasjidDb?: Database };
export const db = globalForDb.__webmasjidDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__webmasjidDb = db;

export type DB = Database;
export { schema };
