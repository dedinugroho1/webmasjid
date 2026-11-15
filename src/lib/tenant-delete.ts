import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { deleteFolder } from "./storage";

/**
 * Hapus satu masjid beserta SELURUH datanya secara permanen:
 *
 * - Baris tenant → kas, agenda, pengumuman, galeri, petugas Jumat, kajian,
 *   pengaturan sholat, dan undangan ikut terhapus (ON DELETE CASCADE).
 * - Akun pengurus masjid ini dihapus (relasi `users.tenant_id` hanya dikosongkan
 *   oleh database, jadi dihapus eksplisit); sesi & kredensialnya ikut terhapus.
 *   Akun SUPERADMIN tidak pernah dihapus.
 * - Folder foto di Bunny dihapus SETELAH database berhasil, sehingga kegagalan
 *   penyimpanan tidak membuat data menunjuk ke file yang sudah hilang.
 */
export async function deleteTenantCompletely(tenantId: string) {
  const removedUsers = await db.transaction(async (tx) => {
    const gone = await tx
      .delete(users)
      .where(and(eq(users.tenantId, tenantId), ne(users.role, "SUPERADMIN")))
      .returning({ id: users.id });
    await tx.delete(tenants).where(eq(tenants.id, tenantId));
    return gone.length;
  });
  const storageCleaned = await deleteFolder(tenantId);
  return { removedUsers, storageCleaned };
}
