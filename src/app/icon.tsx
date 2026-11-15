import { ImageResponse } from "next/og";

export const contentType = "image/png";

/** Ikon aplikasi untuk tab browser & layar utama HP (PWA). */
export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType },
    { id: "512", size: { width: 512, height: 512 }, contentType },
  ];
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const px = Number(await id) || 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#047857",
          color: "#fbbf24",
          fontSize: px * 0.6,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        W
      </div>
    ),
    { width: px, height: px },
  );
}
