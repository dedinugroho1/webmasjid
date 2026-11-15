/**
 * Template gambar Open Graph (pratinjau tautan WhatsApp/Facebook/X) 1200×630.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function ogImage({ title, subtitle, footer }: { title: string; subtitle?: string | null; footer: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #065f46 0%, #0f766e 55%, #134e4a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, color: "#a7f3d0" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
              color: "#064e3b",
            }}
          >
            W
          </div>
          WebMasjid
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: title.length > 28 ? 64 : 80, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 34, color: "#d1fae5" }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#fde68a" }}>{footer}</div>
      </div>
    ),
    OG_SIZE,
  );
}
