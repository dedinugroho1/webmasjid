/**
 * Redirect dari domain sendiri masjid ke domain utama platform.
 *
 * Dipanggil lewat rewrite di proxy.ts. Redirect tidak dikirim langsung dari
 * proxy karena Next.js menormalkan header Location menjadi relatif (host
 * dibandingkan memakai header Host), yang menyebabkan loop di domain sendiri.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  // Diisi proxy (header dari klien ditimpa). Tanpa header → ke beranda.
  const to = request.headers.get("x-webmasjid-redirect-to") ?? "/";
  // Hanya path lokal — cegah open redirect.
  const path = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new Response(null, {
    status: 307,
    headers: { Location: new URL(path, base).toString(), "Cache-Control": "no-store" },
  });
}
