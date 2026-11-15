import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";
import { getTenantBySlug } from "./tenant";
import type { Tenant, UserRole } from "@/db/schema";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type TenantAccess = {
  tenant: Tenant;
  user: { id: string; name: string; email: string; role: UserRole };
};

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/**
 * Aturan akses tenant:
 * - SUPERADMIN boleh mengelola semua masjid (termasuk yang ditangguhkan).
 * - Selain itu, `session.tenantId` (atau `user.tenantId`) harus sama dengan
 *   tenant.id, masjid tidak ditangguhkan, dan role termasuk `roles` (bila diisi).
 */
function evaluate(session: Session, tenant: Tenant, roles?: UserRole[]) {
  const role = (session.user.role ?? "DKM_ADMIN") as UserRole;
  if (role === "SUPERADMIN") return { ok: true as const, role };
  const boundTenant = session.session.tenantId ?? session.user.tenantId;
  if (boundTenant !== tenant.id) return { ok: false as const, reason: "forbidden" };
  if (tenant.suspendedAt) return { ok: false as const, reason: "suspended" };
  if (roles && !roles.includes(role)) return { ok: false as const, reason: "forbidden" };
  return { ok: true as const, role };
}

/**
 * Guard utama multi-tenant: pastikan user login DAN berhak atas masjid `slug`.
 * Gunakan di setiap page/layout/server action admin.
 */
export async function requireTenantAccess(slug: string, roles?: UserRole[]): Promise<TenantAccess> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const session = await getSession();
  if (!session) redirect(`/masuk?next=/${tenant.slug}/admin`);

  const res = evaluate(session, tenant, roles);
  if (!res.ok) redirect(`/masuk?error=${res.reason}&next=/${tenant.slug}/admin`);

  return {
    tenant,
    user: { id: session.user.id, name: session.user.name, email: session.user.email, role: res.role },
  };
}

/** Versi non-redirect untuk route handler (mengembalikan null bila tidak berhak). */
export async function checkTenantAccess(slug: string, roles?: UserRole[]) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return null;
  const session = await getSession();
  if (!session) return null;
  return evaluate(session, tenant, roles).ok ? { tenant, user: session.user } : null;
}

/** Versi non-redirect untuk route handler superadmin. */
export async function checkSuperadmin() {
  const session = await getSession();
  return session?.user.role === "SUPERADMIN" ? session.user : null;
}

/** Guard panel superadmin platform. */
export async function requireSuperadmin() {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/superadmin");
  if (session.user.role !== "SUPERADMIN") redirect("/masuk?error=forbidden&next=/superadmin");
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}
