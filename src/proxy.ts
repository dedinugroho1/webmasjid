/**
 * Next.js Proxy (dulu "middleware").
 *
 * 1. Domain sendiri masjid (mis. masjidalikhlas.or.id):
 *    - halaman publik di-rewrite ke /{slug}/… (URL di browser tetap rapi);
 *    - halaman login/admin diarahkan ke domain utama, karena cookie sesi
 *      hanya berlaku di domain utama.
 * 2. Domain platform: pemeriksaan cepat (optimistic) cookie sesi untuk
 *    /{slug}/admin/* dan /superadmin. Validasi sesungguhnya tetap di server
 *    lewat requireTenantAccess / requireSuperadmin.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { slugForDomain } from "@/lib/domain-lookup";
import { isPlatformHost, normalizeDomain } from "@/lib/domains";
import { getSetupProblem, setupPageHtml } from "@/lib/setup-status";

/** Path yang selalu dilayani domain utama (auth, admin, API). */
const REDIRECT_HEADER = "x-webmasjid-redirect-to";

const PLATFORM_ONLY = /^\/(?:masuk|daftar|undangan|lupa-password|reset-password|privasi|syarat|superadmin|api)(?:\/|$)/;

/**
 * Redirect ke domain utama lewat route handler internal (lihat
 * app/api/platform-redirect). Redirect lintas domain langsung dari proxy akan
 * dinormalkan Next.js menjadi relatif sehingga terjadi loop.
 */
function toMain(request: NextRequest, path: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = "/api/platform-redirect";
  url.search = "";
  const headers = new Headers(request.headers);
  headers.set(REDIRECT_HEADER, `${path}${search}`);
  return NextResponse.rewrite(url, { request: { headers } });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Instance baru yang belum dikonfigurasi → tampilkan petunjuk setup, bukan error.
  const problem = await getSetupProblem();
  if (problem) {
    return new NextResponse(setupPageHtml(problem), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const host = normalizeDomain(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "");

  if (host && !isPlatformHost(host)) {
    const slug = await slugForDomain(host);
    if (!slug) return new NextResponse("Domain belum terhubung ke masjid mana pun di WebMasjid.", { status: 404 });

    // Link absolut /{slug}/… dari dalam halaman → versi rapi tanpa slug.
    if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
      const rest = pathname.slice(slug.length + 1) || "/";
      if (rest.startsWith("/admin")) return toMain(request, `/${slug}${rest}`, search);
      // Tetap di domain sendiri: bentuk URL dari header Host (request.url memakai origin server).
      const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
      const rawHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host")!;
      return NextResponse.redirect(new URL(`${rest}${search}`, `${proto}://${rawHost}`), 308);
    }
    if (pathname.startsWith("/admin")) return toMain(request, `/${slug}${pathname}`, search);
    if (PLATFORM_ONLY.test(pathname)) return toMain(request, pathname, search);

    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  const segments = pathname.split("/").filter(Boolean);
  const isProtected = (segments.length >= 2 && segments[1] === "admin") || segments[0] === "superadmin";
  if (isProtected && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Semua halaman kecuali aset statis Next.js & file publik umum.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
