/**
 * Hapus data uji produksi: masjid ber-slug "prod-uji-…" (beserta seluruh
 * datanya, via ON DELETE CASCADE), akun ber-email "@prod-uji.test", catatan
 * riwayat platform tentang keduanya, dan —
 * bila Bunny Storage dikonfigurasi di environment — folder foto masjid-masjid
 * uji tersebut di Bunny.
 *
 *   npx tsx scripts/cleanup-test-data.ts
 */
import "./load-env";
import { ilike, like, or } from "drizzle-orm";
import { db } from "../src/db";
import { platformAuditLogs, tenants, users } from "../src/db/schema";

/** Hapus folder `{tenantId}/` di Bunny (rekursif). 404 = sudah tidak ada. */
async function deleteBunnyFolder(tenantId: string) {
  const { BUNNY_STORAGE_ZONE: zone, BUNNY_STORAGE_PASSWORD: key, BUNNY_STORAGE_REGION: region } = process.env;
  if (!zone || !key) return null;
  const host = region && /^(ny|la|sg|syd|uk|se|br|jh)$/i.test(region) ? `${region.toLowerCase()}.storage.bunnycdn.com` : "storage.bunnycdn.com";
  const res = await fetch(`https://${host}/${encodeURIComponent(zone)}/${tenantId}/`, { method: "DELETE", headers: { AccessKey: key } });
  return res.status;
}

async function main() {
  const doomed = await db.select({ id: tenants.id }).from(tenants).where(like(tenants.slug, "prod-uji-%"));
  let folders = 0;
  for (const t of doomed) {
    const status = await deleteBunnyFolder(t.id);
    if (status === 200) folders++;
    else if (status !== null && status !== 404) console.warn(`⚠️  Folder Bunny ${t.id} tidak terhapus (HTTP ${status})`);
  }
  const removed = await db.delete(tenants).where(like(tenants.slug, "prod-uji-%")).returning({ slug: tenants.slug });
  const u = await db.delete(users).where(like(users.email, "%@prod-uji.test")).returning({ email: users.email });
  // Riwayat platform tidak ikut terhapus bersama masjid (sengaja), jadi dibersihkan terpisah.
  const logs = await db
    .delete(platformAuditLogs)
    .where(
      or(
        ilike(platformAuditLogs.targetLabel, "%/prod-uji-%"),
        ilike(platformAuditLogs.summary, "%/prod-uji-%"),
        ilike(platformAuditLogs.actorEmail, "%@prod-uji.test"),
      ),
    )
    .returning({ id: platformAuditLogs.id });
  console.log(
    `🧹 Data uji dihapus: ${removed.length} masjid, ${u.length} akun, ${logs.length} catatan riwayat, ${folders} folder Bunny.`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Gagal membersihkan data uji:", e.message);
  process.exit(1);
});
