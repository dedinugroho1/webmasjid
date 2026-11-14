import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer dipakai di route handler (Node runtime) untuk laporan kas PDF.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      // Upload logo / QRIS / bukti transaksi.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
