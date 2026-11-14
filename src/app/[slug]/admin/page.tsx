import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, Building2, HandCoins, Megaphone, Mic, Printer, Wallet } from "lucide-react";
import { db } from "@/db";
import { jumatSchedules } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventList } from "@/components/masjid/event-list";
import { getBalances, getMonthlyReport } from "@/lib/finance";
import { currentMonth, formatDate, formatRupiah, monthLabel, todayISO } from "@/lib/format";
import { fridayOnOrAfter } from "@/lib/jumat";
import { requireTenantAccess } from "@/lib/session";
import { getUpcomingEvents } from "@/lib/tenant";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> };

export default async function AdminHome({ params, searchParams }: Props) {
  const { slug } = await params;
  const { welcome } = await searchParams;
  const { tenant, user } = await requireTenantAccess(slug);
  const canManage = user.role !== "BENDAHARA";
  const month = currentMonth(tenant.timezone);
  const nextFriday = fridayOnOrAfter(todayISO(tenant.timezone));

  const [balances, report, upcoming, [jumat]] = await Promise.all([
    getBalances(tenant.id),
    getMonthlyReport(tenant.id, month),
    getUpcomingEvents(tenant.id, 5),
    db
      .select()
      .from(jumatSchedules)
      .where(and(eq(jumatSchedules.tenantId, tenant.id), eq(jumatSchedules.date, nextFriday)))
      .limit(1),
  ]);
  const monthIn = report.funds.reduce((s, f) => s + f.income, 0);
  const monthOut = report.funds.reduce((s, f) => s + f.expense, 0);

  return (
    <div className="grid gap-6">
      {welcome && (
        <div className="border-primary/30 bg-primary/5 rounded-xl border p-4 text-sm">
          <p className="font-semibold">Ahlan wa sahlan! Website {tenant.name} sudah aktif 🎉</p>
          <p className="text-muted-foreground mt-1">
            Langkah awal: lengkapi alamat & lokasi jadwal sholat, unggah QRIS, lalu isi petugas Jumat dan kajian rutin. Mulai di{" "}
            <Link className="text-primary underline" href={`/${slug}/admin/pengaturan`}>
              Pengaturan
            </Link>
            .
          </p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">Ringkasan</h1>
        <p className="text-muted-foreground text-sm">Assalamu&apos;alaikum, {user.name}.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction href={`/${slug}/admin/kas?catat=infaq-jumat`} icon={<HandCoins />} label="Catat Infaq Jumat" primary />
        <QuickAction href={`/${slug}/admin/kas/jumat`} icon={<Megaphone />} label="Laporan Kas Jumat" />
        {canManage && <QuickAction href={`/${slug}/admin/jumat`} icon={<Mic />} label="Isi Petugas Jumat" />}
        <QuickAction href={`/${slug}/admin/cetak`} icon={<Printer />} label="Cetak Papan Info" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Wallet />} label="Saldo Kas Operasional" value={balances.OPERASIONAL.balance} />
        <Stat icon={<Building2 />} label="Saldo Kas Pembangunan" value={balances.PEMBANGUNAN.balance} />
        <Stat icon={<ArrowDownLeft />} label={`Pemasukan ${monthLabel(month)}`} value={monthIn} tone="in" />
        <Stat icon={<ArrowUpRight />} label={`Pengeluaran ${monthLabel(month)}`} value={monthOut} tone="out" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jumat, {formatDate(nextFriday)}</CardTitle>
            <CardDescription>Petugas sholat Jumat terdekat</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {jumat ? (
              <>
                <p>Khatib: <b>{jumat.khatib ?? "—"}</b></p>
                <p>Imam: <b>{jumat.imam ?? "—"}</b></p>
                <p>Muadzin: <b>{jumat.muadzin ?? "—"}</b></p>
                {jumat.theme && <p className="text-muted-foreground">Tema: {jumat.theme}</p>}
              </>
            ) : (
              <p className="text-amber-700">Petugas belum diisi.</p>
            )}
            {canManage && (
              <Link href={`/${slug}/admin/jumat`} className="text-primary mt-2 text-sm hover:underline">
                Atur petugas Jumat →
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agenda Terdekat</CardTitle>
            <CardDescription>Kegiatan sekali waktu</CardDescription>
          </CardHeader>
          <CardContent>
            <EventList events={upcoming} timeZone={tenant.timezone} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, primary }: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Button asChild variant={primary ? "default" : "outline"} size="lg" className="h-14 justify-start">
      <Link href={href}>
        {icon} {label}
      </Link>
    </Button>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "in" | "out" }) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardDescription className="flex items-center gap-2 [&_svg]:size-4">
          {icon} {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <p className={`font-mono text-xl font-bold ${tone === "in" ? "text-emerald-700" : tone === "out" ? "text-red-700" : ""}`}>
          {formatRupiah(value)}
        </p>
      </CardContent>
    </Card>
  );
}
