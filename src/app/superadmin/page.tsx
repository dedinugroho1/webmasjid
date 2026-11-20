import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { PlatformSwitches } from "@/components/admin/platform-switches";
import { TenantList } from "@/components/admin/tenant-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { formatDate } from "@/lib/format";
import { getPlatformSettings } from "@/lib/platform-settings";
import { listTenantsForAdmin, parseTenantFilter, parseTenantSort, platformStats } from "@/lib/superadmin-queries";
import {
  approveTenant,
  approveTenants,
  changeSlug,
  deleteTenant,
  rejectTenant,
  rejectTenants,
  setModerationEnabled,
  setPublished,
  setRegistrationOpen,
  suspendTenant,
  unsuspendTenant,
} from "./actions";

const TENANT_ACTIONS = {
  setPublished,
  approveTenant,
  rejectTenant,
  suspendTenant,
  unsuspendTenant,
  changeSlug,
  deleteTenant,
  approveTenants,
  rejectTenants,
};

export const metadata: Metadata = { title: "Superadmin", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string; status?: string; urut?: string; hal?: string }> };

export default async function SuperadminPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const filter = parseTenantFilter(sp.status);
  const sort = parseTenantSort(sp.urut);
  const page = Math.max(1, Number(sp.hal) || 1);

  const [settings, stats, list] = await Promise.all([
    getPlatformSettings(),
    platformStats(),
    listTenantsForAdmin({ q, filter, sort, page }),
  ]);

  const query = (over: Record<string, string | number>) => {
    const params = new URLSearchParams({ ...(q ? { q } : {}), status: filter, urut: sort, ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) });
    return `/superadmin?${params.toString()}`;
  };
  const exportHref = `/superadmin/ekspor?${new URLSearchParams({ ...(q ? { q } : {}), status: filter, urut: sort }).toString()}`;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total masjid" value={stats.total} />
        <Stat label="Daftar 30 hari terakhir" value={stats.last30} />
        <Stat label="Menunggu persetujuan" value={stats.pending} highlight={stats.pending > 0} href={query({ status: "menunggu", hal: 1 })} testId="stat-pending" />
        <Stat label="Ditangguhkan" value={stats.suspended} />
        <Stat label="Akun pengguna" value={stats.users} href="/superadmin/pengguna" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Platform</CardTitle>
          <CardDescription>Berlaku langsung tanpa deploy ulang.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformSwitches
            registrationOpen={settings.registrationOpen}
            moderationEnabled={settings.moderationEnabled}
            onRegistration={setRegistrationOpen}
            onModeration={setModerationEnabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semua Masjid</CardTitle>
          <CardDescription>Setujui pendaftaran (satu per satu atau sekaligus), tangguhkan atau hapus yang palsu, hubungi admin, atau ubah alamat masjid.</CardDescription>
          <form className="mt-2 flex flex-wrap items-center gap-2" method="GET">
            <Input name="q" defaultValue={q} placeholder="Cari nama, alamat, kota, atau email admin…" className="max-w-xs" aria-label="Cari masjid" />
            <NativeSelect name="status" defaultValue={filter} className="w-auto" aria-label="Filter status">
              <option value="semua">Semua status</option>
              <option value="menunggu">Menunggu persetujuan</option>
              <option value="ditangguhkan">Ditangguhkan</option>
            </NativeSelect>
            <NativeSelect name="urut" defaultValue={sort} className="w-auto" aria-label="Urutkan">
              <option value="terbaru">Terbaru</option>
              <option value="nama">Nama A–Z</option>
              <option value="transaksi">Transaksi terbanyak</option>
              <option value="pengurus">Pengurus terbanyak</option>
            </NativeSelect>
            <Button type="submit" variant="outline">
              <Search /> Cari
            </Button>
            <Button asChild variant="outline">
              <a href={exportHref} download>
                <Download /> Ekspor CSV
              </a>
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {list.rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Tidak ada masjid yang cocok.</p>
          ) : (
            <TenantList
              rows={list.rows.map((r) => ({
                ...r,
                createdAt: formatDate(r.createdAt),
                approvedAt: r.approvedAt?.toISOString() ?? null,
                suspendedAt: r.suspendedAt?.toISOString() ?? null,
              }))}
              actions={TENANT_ACTIONS}
            />
          )}
          <PaginationLinks page={list.page} pages={list.pages} total={list.total} noun="masjid" hrefFor={(p) => query({ hal: p })} />
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value, href, highlight, testId }: { label: string; value: number; href?: string; highlight?: boolean; testId?: string }) {
  const body = (
    <Card className={`gap-1 py-4 ${highlight ? "border-sky-400 bg-sky-50" : ""}`} data-testid={testId}>
      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-bold">{value.toLocaleString("id-ID")}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
