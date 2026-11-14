import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { Landmark, Search } from "lucide-react";
import { db } from "@/db";
import { cashTransactions, tenants, users } from "@/db/schema";
import { SuperadminRow } from "@/components/admin/superadmin-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { changeSlug, setPublished, suspendTenant, unsuspendTenant } from "./actions";

export const metadata: Metadata = { title: "Superadmin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SuperadminPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const me = await requireSuperadmin();
  const { q = "", status = "" } = await searchParams;

  const filters = [];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(tenants.name, like), ilike(tenants.slug, like), ilike(tenants.city, like)));
  }
  if (status === "suspended") filters.push(isNotNull(tenants.suspendedAt));

  const memberCount = db
    .select({ tenantId: users.tenantId, n: count().as("members") })
    .from(users)
    .groupBy(users.tenantId)
    .as("m");
  const txCount = db
    .select({ tenantId: cashTransactions.tenantId, n: count().as("transactions") })
    .from(cashTransactions)
    .groupBy(cashTransactions.tenantId)
    .as("tx");

  const [rows, [stats]] = await Promise.all([
    db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        city: tenants.city,
        createdAt: tenants.createdAt,
        isPublished: tenants.isPublished,
        suspendedAt: tenants.suspendedAt,
        suspendReason: tenants.suspendReason,
        members: sql<number>`coalesce(${memberCount.n}, 0)`.mapWith(Number),
        transactions: sql<number>`coalesce(${txCount.n}, 0)`.mapWith(Number),
      })
      .from(tenants)
      .leftJoin(memberCount, eq(memberCount.tenantId, tenants.id))
      .leftJoin(txCount, eq(txCount.tenantId, tenants.id))
      .where(filters.length ? sql.join(filters.map((f) => sql`(${f})`), sql` and `) : undefined)
      .orderBy(desc(tenants.createdAt))
      .limit(200),
    db
      .select({
        total: count(),
        suspended: sql<number>`count(*) filter (where ${tenants.suspendedAt} is not null)`.mapWith(Number),
        last30: sql<number>`count(*) filter (where ${tenants.createdAt} > now() - interval '30 days')`.mapWith(Number),
      })
      .from(tenants),
  ]);
  const [{ users: totalUsers }] = await db.select({ users: count() }).from(users);

  return (
    <div className="bg-muted/40 min-h-dvh">
      <header className="bg-background border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Landmark className="text-primary size-5" /> WebMasjid · Superadmin
          </Link>
          <p className="text-muted-foreground text-xs">{me.email}</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Total masjid" value={stats.total} />
          <Stat label="Daftar 30 hari terakhir" value={stats.last30} />
          <Stat label="Ditangguhkan" value={stats.suspended} />
          <Stat label="Akun pengguna" value={totalUsers} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Semua Masjid</CardTitle>
            <CardDescription>Tangguhkan pendaftaran palsu, atur tampilan direktori, atau ubah slug.</CardDescription>
            <form className="mt-2 flex flex-wrap gap-2" method="GET">
              <Input name="q" defaultValue={q} placeholder="Cari nama, slug, atau kota…" className="max-w-xs" />
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="status" value="suspended" defaultChecked={status === "suspended"} /> Hanya ditangguhkan
              </label>
              <Button type="submit" variant="outline">
                <Search /> Cari
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">Tidak ada masjid yang cocok.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <SuperadminRow
                    key={r.id}
                    row={{
                      ...r,
                      createdAt: formatDate(r.createdAt),
                      suspendedAt: r.suspendedAt?.toISOString() ?? null,
                    }}
                    onPublish={setPublished.bind(null, r.id)}
                    onSuspend={suspendTenant.bind(null, r.id)}
                    onUnsuspend={unsuspendTenant.bind(null, r.id)}
                    onChangeSlug={changeSlug.bind(null, r.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-bold">{value.toLocaleString("id-ID")}</p>
      </CardContent>
    </Card>
  );
}
