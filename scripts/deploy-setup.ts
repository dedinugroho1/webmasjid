/**
 * Dijalankan saat build di Vercel (npm run vercel-build), setelah migrasi:
 * bila SEED_DEMO="true" dan masjid demo belum ada, isi data demo /al-ikhlas
 * agar deployment bisa langsung dicoba. Tidak menimpa data yang sudah ada.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { tenants } from "../src/db/schema";

async function main() {
  if (process.env.SEED_DEMO !== "true") {
    console.log("ℹ️  SEED_DEMO bukan \"true\" — lewati data demo.");
    process.exit(0);
  }
  const [demo] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, "al-ikhlas")).limit(1);
  if (demo) {
    console.log("ℹ️  Masjid demo sudah ada — tidak diubah.");
    process.exit(0);
  }
  console.log("🌱 Mengisi data demo…");
  await import("./seed"); // seed.ts menjalankan main() & keluar sendiri
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
