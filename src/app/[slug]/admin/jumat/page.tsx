import Link from "next/link";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { Printer } from "lucide-react";
import { db } from "@/db";
import { jumatSchedules } from "@/db/schema";
import { JumatRow } from "@/components/admin/jumat-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, todayISO } from "@/lib/format";
import { upcomingFridays } from "@/lib/jumat";
import { requireTenantAccess } from "@/lib/session";
import { saveJumat } from "./actions";

export default async function JumatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const fridays = upcomingFridays(tenant.timezone, 8);
  const [rows, past] = await Promise.all([
    db
      .select()
      .from(jumatSchedules)
      .where(and(eq(jumatSchedules.tenantId, tenant.id), inArray(jumatSchedules.date, fridays))),
    db
      .select()
      .from(jumatSchedules)
      .where(and(eq(jumatSchedules.tenantId, tenant.id), lt(jumatSchedules.date, fridays[0])))
      .orderBy(desc(jumatSchedules.date))
      .limit(8),
  ]);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const month = todayISO(tenant.timezone).slice(0, 7);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Petugas Jumat</h1>
          <p className="text-muted-foreground text-sm">
            Isi khatib, imam, dan muadzin untuk 8 Jumat ke depan. Langsung tampil di website masjid.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${slug}/admin/cetak?bulan=${month}`} target="_blank">
            <Printer /> Cetak untuk Papan Pengumuman
          </Link>
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="text-muted-foreground hidden px-3 text-xs font-medium lg:grid lg:grid-cols-[170px_1fr_1fr_1fr_1.3fr_auto] lg:gap-2" aria-hidden>
          <span>Tanggal</span>
          <span>Khatib</span>
          <span>Imam</span>
          <span>Muadzin / Bilal</span>
          <span>Tema khutbah</span>
          <span className="w-24" />
        </div>
        {fridays.map((date, i) => {
          const r = byDate.get(date);
          return (
            <JumatRow
              key={date}
              label={formatDate(date, "UTC", { day: "numeric", month: "long", year: "numeric" })}
              isNext={i === 0}
              initial={r ? { khatib: r.khatib, imam: r.imam, muadzin: r.muadzin, theme: r.theme } : null}
              action={saveJumat.bind(null, slug, date)}
            />
          );
        })}
      </div>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Jumat Sebelumnya</CardTitle>
            <CardDescription>Untuk referensi pembagian giliran khatib.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {past.map((p) => (
                <li key={p.id} className="flex flex-wrap gap-x-4 gap-y-1 py-2">
                  <span className="w-40 font-medium">{formatDate(p.date)}</span>
                  <span>Khatib: {p.khatib ?? "—"}</span>
                  <span>Imam: {p.imam ?? "—"}</span>
                  <span className="text-muted-foreground">Muadzin: {p.muadzin ?? "—"}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
