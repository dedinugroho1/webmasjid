/**
 * Jadikan akun yang sudah ada sebagai SUPERADMIN platform.
 *
 *   npm run superadmin -- email@domain.com          # promosikan
 *   npm run superadmin -- email@domain.com --revoke # cabut (kembali DKM_ADMIN)
 *
 * Akun harus sudah dibuat (mis. lewat /daftar atau undangan).
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) throw new Error("Pemakaian: npm run superadmin -- <email> [--revoke]");
  const revoke = flag === "--revoke";

  const [user] = await db
    .update(users)
    .set({ role: revoke ? "DKM_ADMIN" : "SUPERADMIN" })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ id: users.id, name: users.name });
  if (!user) throw new Error(`Akun ${email} tidak ditemukan.`);

  // Paksa login ulang agar peran baru langsung berlaku.
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log(`✅ ${user.name} <${email}> sekarang ${revoke ? "DKM_ADMIN" : "SUPERADMIN"}. Silakan login ulang.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`❌ ${e.message}`);
  process.exit(1);
});
