/**
 * Seed data demo: Masjid Al-Ikhlas (/al-ikhlas) + akun admin demo.
 *
 *   npm run db:seed
 *
 * Akun demo: admin@webmasjid.test / demo12345 (ubah lewat env SEED_ADMIN_*).
 * Opsional: SEED_SUPERADMIN_EMAIL membuat akun superadmin (password sama) —
 * hanya untuk development/CI, JANGAN dipakai di produksi.
 * Aman dijalankan berulang — data demo lama untuk slug yang sama dihapus dulu.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/db";
import { accounts, announcements, cashTransactions, events, prayerSettings, tenants, users } from "../src/db/schema";

const SLUG = "al-ikhlas";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@webmasjid.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "demo12345";
const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL;

function isoDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diset (lihat .env.example)");

  console.log("🧹 Menghapus data demo lama…");
  await db.delete(tenants).where(eq(tenants.slug, SLUG));
  await db.delete(users).where(eq(users.email, ADMIN_EMAIL));
  if (SUPERADMIN_EMAIL) await db.delete(users).where(eq(users.email, SUPERADMIN_EMAIL));

  console.log("🕌 Membuat Masjid Al-Ikhlas…");
  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Masjid Al-Ikhlas",
      slug: SLUG,
      description: "Masjid jami' yang makmur, ramah anak, dan transparan. Contoh website dari platform WebMasjid.",
      address: "Jl. Merdeka No. 17, Menteng",
      city: "Jakarta",
      latitude: -6.1959,
      longitude: 106.8317,
      timezone: "Asia/Jakarta",
      phone: "0812-0000-0000",
      email: "dkm@al-ikhlas.test",
      bankAccounts: [
        { bank: "BSI", number: "7123 4567 89", holder: "DKM Masjid Al-Ikhlas" },
        { bank: "BRI", number: "0123 0100 0456 307", holder: "DKM Masjid Al-Ikhlas" },
      ],
      runningText:
        "Luruskan dan rapatkan shaf | Harap non-aktifkan / silent handphone | Kajian Tafsir setiap Ahad ba'da Subuh | Infaq dapat melalui QRIS di website masjid",
    })
    .returning();

  await db.insert(prayerSettings).values({ tenantId: tenant.id, calculationMethod: "KEMENAG", iqomahOffsetMinutes: 10 });

  console.log("👤 Membuat admin demo…");
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    name: "Bendahara Demo",
    email: ADMIN_EMAIL,
    emailVerified: true,
    tenantId: tenant.id,
    role: "DKM_ADMIN",
  });
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(ADMIN_PASSWORD),
  });

  if (SUPERADMIN_EMAIL) {
    console.log("🛡️  Membuat superadmin (development)…");
    const superId = crypto.randomUUID();
    await db.insert(users).values({ id: superId, name: "Superadmin", email: SUPERADMIN_EMAIL, emailVerified: true, role: "SUPERADMIN" });
    await db.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: superId,
      providerId: "credential",
      userId: superId,
      password: await hashPassword(ADMIN_PASSWORD),
    });
  }

  console.log("💰 Mengisi buku kas…");
  const tx: (typeof cashTransactions.$inferInsert)[] = [];
  for (let week = 0; week < 10; week++) {
    tx.push({
      tenantId: tenant.id, type: "IN", fund: "OPERASIONAL", category: "Infaq Jumat",
      amount: 2_500_000 + ((week * 317_000) % 1_200_000), description: `Kotak Jumat pekan ke-${10 - week}`,
      transactionDate: isoDaysAgo(week * 7 + 1), createdBy: userId,
    });
    tx.push({
      tenantId: tenant.id, type: "IN", fund: "OPERASIONAL", category: "Kotak Amal Harian",
      amount: 450_000 + ((week * 91_000) % 300_000), transactionDate: isoDaysAgo(week * 7 + 4), createdBy: userId,
    });
  }
  tx.push(
    { tenantId: tenant.id, type: "IN", fund: "PEMBANGUNAN", category: "Donasi Pembangunan", amount: 25_000_000, description: "Hamba Allah — renovasi tempat wudhu", transactionDate: isoDaysAgo(20), createdBy: userId },
    { tenantId: tenant.id, type: "IN", fund: "PEMBANGUNAN", category: "Transfer Donatur", amount: 7_500_000, description: "Alumni remaja masjid", transactionDate: isoDaysAgo(9), createdBy: userId },
    { tenantId: tenant.id, type: "OUT", fund: "PEMBANGUNAN", category: "Material Pembangunan", amount: 12_350_000, description: "Keramik & pipa tempat wudhu", transactionDate: isoDaysAgo(6), createdBy: userId },
    { tenantId: tenant.id, type: "OUT", fund: "OPERASIONAL", category: "Listrik", amount: 1_850_000, description: "Token PLN bulanan", transactionDate: isoDaysAgo(12), createdBy: userId },
    { tenantId: tenant.id, type: "OUT", fund: "OPERASIONAL", category: "Air", amount: 320_000, description: "Tagihan PAM", transactionDate: isoDaysAgo(12), createdBy: userId },
    { tenantId: tenant.id, type: "OUT", fund: "OPERASIONAL", category: "Honor Marbot", amount: 2_000_000, description: "Honor 2 marbot", transactionDate: isoDaysAgo(3), createdBy: userId },
    { tenantId: tenant.id, type: "OUT", fund: "OPERASIONAL", category: "Honor Ustadz / Khatib", amount: 1_500_000, description: "Khatib Jumat & kajian rutin", transactionDate: isoDaysAgo(2), createdBy: userId },
    { tenantId: tenant.id, type: "OUT", fund: "OPERASIONAL", category: "Kebersihan", amount: 275_000, description: "Sabun, pewangi karpet", transactionDate: isoDaysAgo(5), createdBy: userId },
  );
  await db.insert(cashTransactions).values(tx);

  console.log("📅 Mengisi agenda…");
  const at = (days: number, hourWIB: number, minute = 0) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(hourWIB - 7, minute, 0, 0);
    return d;
  };
  const daysToFriday = (5 - new Date().getUTCDay() + 7) % 7 || 7;
  await db.insert(events).values([
    { tenantId: tenant.id, type: "JUMAT", title: "Sholat Jumat — Menjaga Amanah", speaker: "Ust. Ahmad Fauzi, Lc.", imam: "Ust. Hasan Basri", dateTime: at(daysToFriday, 11, 45), location: "Ruang utama" },
    { tenantId: tenant.id, type: "KAJIAN", title: "Kajian Tafsir Juz 30", speaker: "Ust. Abdullah Syafi'i", dateTime: at(2, 5, 15), location: "Ruang utama", description: "Rutin setiap Ahad ba'da Subuh. Terbuka untuk umum." },
    { tenantId: tenant.id, type: "KAJIAN", title: "Kajian Muslimah: Fiqih Keluarga", speaker: "Ustadzah Fatimah", dateTime: at(4, 16, 0), location: "Lantai 2" },
    { tenantId: tenant.id, type: "SOSIAL", title: "Santunan Anak Yatim & Dhuafa", dateTime: at(10, 9, 0), location: "Halaman masjid", description: "Penyaluran 50 paket sembako." },
  ]);

  console.log("📣 Mengisi pengumuman…");
  await db.insert(announcements).values([
    {
      tenantId: tenant.id,
      title: "Renovasi Tempat Wudhu Putra",
      body: "Mulai Senin depan tempat wudhu putra direnovasi selama ±2 pekan. Jamaah dipersilakan berwudhu di sisi selatan masjid. Jazakumullahu khairan atas pengertiannya.",
      isPinned: true,
      createdBy: userId,
    },
    {
      tenantId: tenant.id,
      title: "Pendaftaran TPA Angkatan Baru",
      body: "Pendaftaran santri TPA (usia 5–12 tahun) dibuka hingga akhir bulan. Hubungi sekretariat DKM ba'da Maghrib.",
      createdBy: userId,
    },
  ]);

  console.log(`\n✅ Selesai! Buka http://localhost:3000/${SLUG}`);
  console.log(`   Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} → /${SLUG}/admin`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
