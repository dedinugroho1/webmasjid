/**
 * Next.js Proxy (dulu "middleware"): pemeriksaan cepat (optimistic) cookie
 * sesi untuk route admin `/{slug}/admin/*`. Validasi sesungguhnya (sesi valid
 * + tenant cocok + role) tetap dilakukan di server lewat `requireTenantAccess`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const isAdmin = (segments.length >= 2 && segments[1] === "admin") || segments[0] === "superadmin";

  if (isAdmin && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:slug/admin/:path*", "/superadmin/:path*"],
};
