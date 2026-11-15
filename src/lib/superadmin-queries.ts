import "server-only";
import { and, asc, count, desc, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cashTransactions, tenants, users } from "@/db/schema";

export const ADMIN_PAGE_SIZE = 20;

export type TenantFilter = "semua" | "menunggu" | "ditangguhkan";
export type TenantSort = "terbaru" | "nama" | "transaksi" | "pengurus";

export function parseTenantFilter(v: string | undefined): TenantFilter {
  return v === "menunggu" || v === "ditangguhkan" ? v : "semua";
}
export function parseTenantSort(v: string | undefined): TenantSort {
  return v === "nama" || v === "transaksi" || v === "pengurus" ? v : "terbaru";
}

// Subquery berkorelasi: murah karena hanya dijalankan untuk satu halaman (20 baris).
// Kolom tenants.id ditulis eksplisit: Drizzle membuang awalan tabel pada query satu-tabel,
// sehingga `${tenants.id}` di dalam subquery terbaca sebagai kolom `id` milik `users`.
const TENANT_ID = sql.raw('"tenants"."id"');
// Kontak utama: Admin DKM dulu, lalu Superadmin yang terikat ke masjid, lalu pengguna mana pun (yang tertua).
const CONTACT_ORDER = sql.raw(`case u.role when 'DKM_ADMIN' then 0 when 'SUPERADMIN' then 1 else 2 end, u.created_at asc`);
const adminName = sql<string | null>`(select u.name from ${users} u where u.tenant_id = ${TENANT_ID} order by ${CONTACT_ORDER} limit 1)`;
const adminEmail = sql<string | null>`(select u.email from ${users} u where u.tenant_id = ${TENANT_ID} order by ${CONTACT_ORDER} limit 1)`;
const memberCount = sql<number>`(select count(*)::int from ${users} u where u.tenant_id = ${TENANT_ID})`;
const txCount = sql<number>`(select count(*)::int from ${cashTransactions} c where c.tenant_id = ${TENANT_ID})`;

/** Kondisi pencarian & filter, dipakai juga oleh ekspor CSV. */
export function tenantWhere(q: string, filter: TenantFilter): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  const term = q.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(
      or(
        ilike(tenants.name, like),
        ilike(tenants.slug, like),
        ilike(tenants.city, like),
        sql`exists (select 1 from ${users} u where u.tenant_id = ${TENANT_ID} and (u.email ilike ${like} or u.name ilike ${like}))`,
      ),
    );
  }
  if (filter === "menunggu") conds.push(and(isNull(tenants.approvedAt), isNull(tenants.suspendedAt)));
  if (filter === "ditangguhkan") conds.push(isNotNull(tenants.suspendedAt));
  return and(...conds);
}

function tenantOrder(sort: TenantSort) {
  switch (sort) {
    case "nama":
      return [asc(sql`lower(${tenants.name})`)];
    case "transaksi":
      return [desc(txCount), desc(tenants.createdAt)];
    case "pengurus":
      return [desc(memberCount), desc(tenants.createdAt)];
    default:
      return [desc(tenants.createdAt)];
  }
}

const tenantColumns = {
  id: tenants.id,
  name: tenants.name,
  slug: tenants.slug,
  city: tenants.city,
  createdAt: tenants.createdAt,
  isPublished: tenants.isPublished,
  isDemo: tenants.isDemo,
  approvedAt: tenants.approvedAt,
  suspendedAt: tenants.suspendedAt,
  suspendReason: tenants.suspendReason,
  adminName,
  adminEmail,
  members: memberCount.mapWith(Number),
  transactions: txCount.mapWith(Number),
};

export async function listTenantsForAdmin(opts: { q: string; filter: TenantFilter; sort: TenantSort; page: number }) {
  const where = tenantWhere(opts.q, opts.filter);
  const page = Math.max(1, opts.page);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(tenantColumns)
      .from(tenants)
      .where(where)
      .orderBy(...tenantOrder(opts.sort))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: count() }).from(tenants).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

/** Semua masjid yang cocok (tanpa halaman), untuk ekspor CSV. */
export async function exportTenantsForAdmin(opts: { q: string; filter: TenantFilter; sort: TenantSort }) {
  return db
    .select(tenantColumns)
    .from(tenants)
    .where(tenantWhere(opts.q, opts.filter))
    .orderBy(...tenantOrder(opts.sort))
    .limit(50_000);
}

export async function platformStats() {
  const [row] = await db
    .select({
      total: count(),
      pending: sql<number>`count(*) filter (where ${tenants.approvedAt} is null and ${tenants.suspendedAt} is null)`.mapWith(Number),
      suspended: sql<number>`count(*) filter (where ${tenants.suspendedAt} is not null)`.mapWith(Number),
      last30: sql<number>`count(*) filter (where ${tenants.createdAt} > now() - interval '30 days')`.mapWith(Number),
    })
    .from(tenants);
  const [{ users: totalUsers }] = await db.select({ users: count() }).from(users);
  return { ...row, users: totalUsers };
}

export type UserFilter = "semua" | "SUPERADMIN" | "DKM_ADMIN" | "BENDAHARA" | "tanpa-masjid";

export function parseUserFilter(v: string | undefined): UserFilter {
  return v === "SUPERADMIN" || v === "DKM_ADMIN" || v === "BENDAHARA" || v === "tanpa-masjid" ? v : "semua";
}

function userWhere(q: string, filter: UserFilter): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  const term = q.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(users.email, like), ilike(users.name, like)));
  }
  if (filter === "tanpa-masjid") conds.push(and(isNull(users.tenantId), sql`${users.role} <> 'SUPERADMIN'`));
  else if (filter !== "semua") conds.push(sql`${users.role} = ${filter}`);
  return and(...conds);
}

export async function listUsersForAdmin(opts: { q: string; filter: UserFilter; page: number }) {
  const where = userWhere(opts.q, opts.filter);
  const page = Math.max(1, opts.page);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(users)
      .leftJoin(tenants, sql`${tenants.id} = ${users.tenantId}`)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: count() }).from(users).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}
