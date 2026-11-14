/**
 * Koneksi database + Drizzle ORM.
 *
 * Default: Neon Postgres via `@neondatabase/serverless` (WebSocket Pool) dan
 * `drizzle-orm/neon-serverless`. Driver WebSocket dipilih (bukan neon-http)
 * karena mendukung transaksi interaktif.
 *
 * Alternatif: set `DATABASE_DRIVER=pg` untuk Postgres biasa (VPS, Docker,
 * CI, development lokal) memakai `node-postgres`. Skema & query identik.
 */
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import { databaseUrl } from "../lib/env";
import * as schema from "./schema";

// Node.js < 22 belum punya WebSocket global; `ws` aman dipakai di semua versi.
neonConfig.webSocketConstructor = ws;

type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

function createDb(): Database {
  const connectionString = databaseUrl();
  if (process.env.DATABASE_DRIVER === "pg") {
    const pool = new pg.Pool({ connectionString, max: 10 });
    // API query & transaksi Drizzle sama untuk kedua driver.
    return drizzlePg({ client: pool, schema }) as unknown as Database;
  }
  return drizzleNeon({ client: new NeonPool({ connectionString }), schema });
}

// Reuse koneksi antar hot-reload di development.
const globalForDb = globalThis as unknown as { __webmasjidDb?: Database };
export const db = globalForDb.__webmasjidDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__webmasjidDb = db;

export type DB = Database;
export { schema };
