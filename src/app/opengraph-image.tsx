import { OG_SIZE, ogImage } from "@/lib/og-image";

export const alt = "WebMasjid — website masjid sederhana & transparan";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "Website masjid yang sederhana & transparan",
    subtitle: "Gratis · Open-source · Untuk masjid di desa maupun kota",
    footer: "Buku kas · Infaq Jumat · Petugas Jumat · Kajian rutin",
  });
}
