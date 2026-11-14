/**
 * Perkecil foto di browser sebelum diunggah (JPEG). Foto HP 4–8 MB biasanya
 * menjadi ±150–300 KB, sehingga tetap muat walau tanpa Vercel Blob (batas
 * data URL 300 KB). Bila masih terlalu besar, kualitas lalu dimensi
 * diturunkan bertahap.
 */
const TARGET_BYTES = 280 * 1024;
const SIZES = [1600, 1280, 1024, 800];
const QUALITIES = [0.8, 0.65, 0.5];

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  let best: Blob | null = null;

  try {
    for (const maxSize of SIZES) {
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const q of QUALITIES) {
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= TARGET_BYTES) return toFile(blob, file.name);
      }
    }
  } finally {
    bitmap.close();
  }
  return best && best.size < file.size ? toFile(best, file.name) : file;
}

function toFile(blob: Blob, name: string) {
  return new File([blob], name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
