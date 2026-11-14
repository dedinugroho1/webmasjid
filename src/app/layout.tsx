import type { Metadata, Viewport } from "next";
import "./globals.css";

import { appUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "WebMasjid — Website Masjid Modern, Transparan & Gratis",
    template: "%s · WebMasjid",
  },
  description:
    "Platform open-source untuk website masjid: buku kas transparan, jadwal sholat otomatis, infaq QRIS, dan agenda kajian. Amal jariyah digital.",
  openGraph: { siteName: "WebMasjid", locale: "id_ID", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
