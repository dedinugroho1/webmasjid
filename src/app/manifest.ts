import type { MetadataRoute } from "next";

/** PWA: pengurus bisa "Tambahkan ke layar utama" dan membuka dashboard seperti aplikasi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WebMasjid",
    short_name: "WebMasjid",
    description: "Buku kas, infaq Jumat, petugas Jumat, dan kajian rutin masjid.",
    start_url: "/masuk",
    display: "standalone",
    background_color: "#f6faf8",
    theme_color: "#047857",
    lang: "id",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
