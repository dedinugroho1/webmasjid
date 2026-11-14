/**
 * Hapus data uji produksi: masjid ber-slug "prod-uji-…" (beserta seluruh
 * datanya, via ON DELETE CASCADE) dan akun ber-email "@prod-uji.test".
 *
 *   npx tsx scripts/cleanup-test-data.ts
 */
import "./load-env";
import { like, or } from "drizzle-orm";
import { db } from "../src/db";
import { tenants, users } from "../src/db/schema";

async function main() {
  const t = await db.delete(tenants).where(like(tenants.slug, "prod-uji-%")).returning({ slug: tenants.slug });
  const u = await db
    .delete(users)
    .where(or(like(users.email, "%@prod-uji.test")))
    .returning({ email: users.email });
  console.log(`🧹 Data uji dihapus: ${t.length} masjid, ${u.length} akun.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Gagal membersihkan data uji:", e.message);
  process.exit(1);
});
