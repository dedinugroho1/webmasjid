import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Building2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventList } from "@/components/masjid/event-list";
import { getBalances, getMonthlyReport } from "@/lib/finance";
import { currentMonth, formatRupiah, monthLabel } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { getUpcomingEvents } from "@/lib/tenant";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> };

export default async function AdminHome({ params, searchParams }: Props) {
  const { slug } = await params;
  const { welcome } = await searchParams;
  const { tenant } = await requireTenantAccess(slug);
  const month = currentMonth(tenant.timezone);

  const [balances, report, upcoming] = await Promise.all([
    getBalances(tenant.id),
    getMonthlyReport(tenant.id, month),
    getUpcomingEvents(tenant.id, 5),
  ]);
  const monthIn = report.funds.reduce((s, f) => s + f.income, 0);
  const monthOut = report.funds.reduce((s, f) => s + f.expense, 0);

  return (
    <div className="grid gap-6">
      {welcome && (
        <div className="border-primary/30 bg-primary/5 rounded-xl border p-4 text-sm">
          <p className="font-semibold">Ahlan wa sahlan! Website {tenant.name} sudah aktif 🎉</p>
          <p className="text-muted-foreground mt-1">
            Lengkapi profil, unggah QRIS, dan atur lokasi untuk jadwal sholat di menu{" "}
            <Link className="text-primary underline" href={`/${slug}/admin/pengaturan`}>
              Pengaturan
            </Link>
            .
          </p>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">Ringkasan</h1>
        <p className="text-muted-foreground text-sm">Kondisi kas & agenda {tenant.name}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Wallet />} label="Saldo Kas Operasional" value={balances.OPERASIONAL.balance} />
        <Stat icon={<Building2 />} label="Saldo Kas Pembangunan" value={balances.PEMBANGUNAN.balance} />
        <Stat icon={<ArrowDownLeft />} label={`Pemasukan ${monthLabel(month)}`} value={monthIn} tone="in" />
        <Stat icon={<ArrowUpRight />} label={`Pengeluaran ${monthLabel(month)}`} value={monthOut} tone="out" />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Agenda Terdekat</CardTitle>
            <CardDescription>Ditampilkan di halaman publik masjid.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${slug}/admin/agenda`}>Kelola</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <EventList events={upcoming} timeZone={tenant.timezone} />
        </CardContent>
      </Card>
    </div>
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
        <p
          className={`font-mono text-xl font-bold ${tone === "in" ? "text-emerald-700" : tone === "out" ? "text-red-700" : ""}`}
        >
          {formatRupiah(value)}
        </p>
      </CardContent>
    </Card>
  );
}
