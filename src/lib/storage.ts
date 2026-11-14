import "server-only";

const MAX_INLINE_BYTES = 300 * 1024;
const MAX_BLOB_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Simpan gambar (logo, QRIS, foto, bukti transaksi) dan kembalikan URL-nya.
 *
 * - Bila `BLOB_READ_WRITE_TOKEN` tersedia → Vercel Blob (disarankan untuk produksi).
 * - Bila tidak → disimpan sebagai data URL di database (maks 300 KB), agar
 *   self-host tetap jalan tanpa layanan penyimpanan tambahan.
 *
 * Mengembalikan `null` bila tidak ada file yang diunggah.
 */
export async function uploadImage(file: FormDataEntryValue | null, folder: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (!ALLOWED.includes(file.type)) throw new Error("Format gambar harus PNG, JPG, WEBP, atau GIF.");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    if (file.size > MAX_BLOB_BYTES) throw new Error("Ukuran gambar maksimal 4 MB.");
    const { put } = await import("@vercel/blob");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`${folder}/${safeName}`, file, { access: "public", addRandomSuffix: true });
    return blob.url;
  }

  if (file.size > MAX_INLINE_BYTES) {
    throw new Error("Ukuran gambar maksimal 300 KB (atau set BLOB_READ_WRITE_TOKEN untuk file lebih besar).");
  }
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}
