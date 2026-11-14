import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DatePickerNav } from "@/components/admin/date-picker-nav";
import { ReportShare } from "@/components/admin/report-share";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FUND_LABELS } from "@/lib/constants";
import { getJumatReport } from "@/lib/finance";
import { formatDate, formatRupiah, todayISO } from "@/lib/format";
import { addDays, fridayOnOrBefore } from "@/lib/jumat";
import { jumatReportText } from "@/lib/jumat-report";
import { requireTenantAccess } from "@/lib/session";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tanggal?: string }> };

export default async function LaporanJumatPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tanggal } = await searchParams;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);
  const base = tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? tanggal : todayISO(tenant.timezone);
  const friday = fridayOnOrBefore(base);
  const report = await getJumatReport(tenant.id, friday);
  const text = jumatReportText(tenant.name, report);
  const nav = (d: string) => `/${slug}/admin/kas/jumat?tanggal=${d}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Laporan Kas Jumat</h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan pekan Sabtu–Jumat untuk dibacakan sebelum khutbah dan dibagikan ke grup jamaah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Jumat sebelumnya">
            <Link href={nav(addDays(friday, -7))}>
              <ChevronLeft />
            </Link>
          </Button>
          <DatePickerNav type="date" value={friday} param="tanggal" basePath={`/${slug}/admin/kas/jumat`} label="Pilih Jumat" />
          <Button asChild variant="outline" size="icon" aria-label="Jumat berikutnya">
            <Link href={nav(addDays(friday, 7))}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        {report.funds.map((f) => (
          <Card key={f.fund} className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardDescription>{FUND_LABELS[f.fund]}</CardDescription>
              <CardTitle className="font-mono text-xl">{formatRupiah(f.closing)}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground grid grid-cols-3 gap-2 px-5 text-xs">
              <span>Pekan lalu<br /><b className="text-foreground">{formatRupiah(f.opening)}</b></span>
              <span>Masuk<br /><b className="text-emerald-700">{formatRupiah(f.income)}</b></span>
              <span>Keluar<br /><b className="text-red-700">{formatRupiah(f.expense)}</b></span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle>Teks Laporan — Jumat, {formatDate(friday)}</CardTitle>
          <CardDescription>Bisa disalin, dikirim ke WhatsApp, atau dicetak.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <pre className="bg-muted/50 rounded-lg border p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap print:border-0 print:bg-transparent print:text-base">
            {text.replaceAll("*", "")}
          </pre>
          <ReportShare text={text} />
        </CardContent>
      </Card>
    </div>
  );
}
