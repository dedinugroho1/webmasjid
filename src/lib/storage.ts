import "server-only";
import { randomUUID } from "node:crypto";

const MAX_INLINE_BYTES = 300 * 1024;
const MAX_REMOTE_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Kode region Bunny Storage → host API. Kosong = region utama (Falkenstein, DE). */
const BUNNY_REGIONS = new Set(["ny", "la", "sg", "syd", "uk", "se", "br", "jh"]);

export type BunnyConfig = {
  zone: string;
  accessKey: string;
  /** Origin API penyimpanan, mis. "https://sg.storage.bunnycdn.com". */
  origin: string;
  /** URL publik (Pull Zone) tanpa garis miring di akhir, mis. "https://masjid.b-cdn.net". */
  publicUrl: string;
};

/**
 * Konfigurasi Bunny Storage dari environment, atau `null` bila belum lengkap.
 *
 * - `BUNNY_STORAGE_ZONE`     nama Storage Zone
 * - `BUNNY_STORAGE_PASSWORD` password Storage Zone (FTP & API Access → Password)
 * - `BUNNY_STORAGE_REGION`   opsional: sg, ny, la, syd, uk, se, br, jh (kosong = DE)
 * - `BUNNY_CDN_URL`          URL Pull Zone yang terhubung ke zone tersebut
 * - `BUNNY_STORAGE_ENDPOINT` hanya untuk pengujian: origin API pengganti (server tiruan)
 */
export function bunnyConfig(env: Record<string, string | undefined> = process.env): BunnyConfig | null {
  const zone = env.BUNNY_STORAGE_ZONE?.trim();
  const accessKey = env.BUNNY_STORAGE_PASSWORD?.trim();
  const cdn = env.BUNNY_CDN_URL?.trim();
  if (!zone || !accessKey || !cdn) return null;

  const region = env.BUNNY_STORAGE_REGION?.trim().toLowerCase();
  const host = region && BUNNY_REGIONS.has(region) ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
  const origin = (env.BUNNY_STORAGE_ENDPOINT?.trim() || `https://${host}`).replace(/\/+$/, "");
  const publicUrl = (/^https?:\/\//.test(cdn) ? cdn : `https://${cdn}`).replace(/\/+$/, "");
  return { zone, accessKey, origin, publicUrl };
}

function objectUrl(cfg: BunnyConfig, path: string) {
  return `${cfg.origin}/${encodeURIComponent(cfg.zone)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Simpan gambar (logo, QRIS, foto, bukti transaksi) dan kembalikan URL-nya.
 *
 * - Bila Bunny Storage dikonfigurasi → diunggah ke Bunny, URL publik via CDN
 *   (disarankan untuk produksi; foto tidak membebani database).
 * - Bila tidak → disimpan sebagai data URL di database (maks 300 KB), agar
 *   self-host tetap jalan tanpa layanan penyimpanan tambahan.
 *
 * Mengembalikan `null` bila tidak ada file yang diunggah.
 */
export async function uploadImage(file: FormDataEntryValue | null, folder: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (!ALLOWED.includes(file.type)) throw new Error("Format gambar harus PNG, JPG, WEBP, atau GIF.");

  const bunny = bunnyConfig();
  if (bunny) {
    if (file.size > MAX_REMOTE_BYTES) throw new Error("Ukuran gambar maksimal 4 MB.");
    const path = `${folder}/${randomUUID()}.${EXTENSIONS[file.type]}`;
    let res: Response;
    try {
      res = await fetch(objectUrl(bunny, path), {
        method: "PUT",
        headers: { AccessKey: bunny.accessKey, "Content-Type": "application/octet-stream" },
        body: new Uint8Array(await file.arrayBuffer()),
      });
    } catch {
      throw new Error("Tidak bisa menghubungi penyimpanan gambar. Coba lagi sebentar lagi.");
    }
    if (!res.ok) {
      console.error(`[storage] Bunny upload gagal: HTTP ${res.status}`);
      throw new Error(
        res.status === 401
          ? "Penyimpanan gambar menolak akses (periksa BUNNY_STORAGE_PASSWORD)."
          : "Gagal mengunggah gambar. Coba lagi sebentar lagi.",
      );
    }
    return `${bunny.publicUrl}/${path}`;
  }

  if (file.size > MAX_INLINE_BYTES) {
    throw new Error("Ukuran gambar maksimal 300 KB (atau aktifkan Bunny Storage untuk file lebih besar).");
  }
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

/**
 * Hapus gambar lama dari Bunny. Hanya menyentuh URL milik CDN kita; data URL
 * dan URL lain diabaikan. Tidak pernah melempar error — file yatim di storage
 * jauh lebih ringan akibatnya daripada aksi pengguna yang gagal.
 */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  const bunny = bunnyConfig();
  if (!bunny || !url || !url.startsWith(`${bunny.publicUrl}/`)) return;
  try {
    const path = decodeURIComponent(url.slice(bunny.publicUrl.length + 1).split(/[?#]/)[0]);
    if (!path || path.includes("..")) return;
    const res = await fetch(objectUrl(bunny, path), { method: "DELETE", headers: { AccessKey: bunny.accessKey } });
    if (!res.ok && res.status !== 404) console.error(`[storage] Bunny hapus gagal: HTTP ${res.status}`);
  } catch (e) {
    console.error("[storage] Bunny hapus gagal:", (e as Error).message);
  }
}

/**
 * Hapus seluruh folder (rekursif) di Bunny, mis. `{tenantId}` saat masjid dihapus.
 * Tidak pernah melempar error; mengembalikan `true` bila folder terhapus atau memang tidak ada.
 */
export async function deleteFolder(prefix: string): Promise<boolean> {
  const bunny = bunnyConfig();
  if (!bunny) return true;
  // Hanya awalan sederhana (UUID/slug); tolak path kosong atau traversal.
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(prefix) || prefix.includes("..")) return false;
  try {
    const res = await fetch(`${objectUrl(bunny, prefix.replace(/\/+$/, ""))}/`, {
      method: "DELETE",
      headers: { AccessKey: bunny.accessKey },
    });
    if (!res.ok && res.status !== 404) {
      console.error(`[storage] Bunny hapus folder gagal: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[storage] Bunny hapus folder gagal:", (e as Error).message);
    return false;
  }
}
