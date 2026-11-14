/**
 * Koneksi Neon Postgres via `@neondatabase/serverless` (WebSocket Pool)
 * + Drizzle ORM (`drizzle-orm/neon-serverless`).
 *
 * Driver WebSocket dipilih (bukan neon-http) karena mendukung transaksi
 * interaktif — dibutuhkan saat pendaftaran masjid (buat tenant + assign user).
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Node.js < 22 belum punya WebSocket global; `ws` aman dipakai di semua versi.
neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as { __webmasjidPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn("[webmasjid] DATABASE_URL belum diset.");
  }
  return new Pool({ connectionString });
}

// Reuse pool antar hot-reload di development.
const pool = globalForDb.__webmasjidPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__webmasjidPool = pool;

export const db = drizzle({ client: pool, schema });
export type DB = typeof db;
export { schema };
