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

/**
 * Guard utama multi-tenant: pastikan user login DAN berhak atas masjid `slug`.
 *
 * Aturan:
 * - SUPERADMIN boleh mengelola semua masjid.
 * - Selain itu, `session.tenantId` (atau `user.tenantId`) harus sama dengan tenant.id.
 * - `roles` opsional untuk membatasi modul tertentu (mis. Buku Kas: DKM_ADMIN & BENDAHARA).
 *
 * Gunakan di setiap page/layout/server action/route handler admin.
 */
export async function requireTenantAccess(slug: string, roles?: UserRole[]): Promise<TenantAccess> {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const session = await getSession();
  if (!session) redirect(`/masuk?next=/${tenant.slug}/admin`);

  const role = (session.user.role ?? "DKM_ADMIN") as UserRole;
  const boundTenant = session.session.tenantId ?? session.user.tenantId;
  const allowed = role === "SUPERADMIN" || (boundTenant === tenant.id && (!roles || roles.includes(role)));
  if (!allowed) redirect(`/masuk?error=forbidden&next=/${tenant.slug}/admin`);

  return {
    tenant,
    user: { id: session.user.id, name: session.user.name, email: session.user.email, role },
  };
}

/** Versi non-redirect untuk route handler (mengembalikan null bila tidak berhak). */
export async function checkTenantAccess(slug: string, roles?: UserRole[]) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return null;
  const session = await getSession();
  if (!session) return null;
  const role = (session.user.role ?? "DKM_ADMIN") as UserRole;
  const boundTenant = session.session.tenantId ?? session.user.tenantId;
  const allowed = role === "SUPERADMIN" || (boundTenant === tenant.id && (!roles || roles.includes(role)));
  return allowed ? { tenant, user: session.user } : null;
}
