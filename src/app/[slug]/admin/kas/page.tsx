import Link from "next/link";
import { FileDown, History, Megaphone, Paperclip, Pencil, Sheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/admin/delete-button";
import { TransactionForm } from "@/components/admin/transaction-form";
import { FUND_LABELS } from "@/lib/constants";
import { getMonthlyReport } from "@/lib/finance";
import { currentMonth, formatDate, formatRupiah, monthLabel, todayISO } from "@/lib/format";
import { fridayOnOrBefore } from "@/lib/jumat";
import { requireTenantAccess } from "@/lib/session";
import { createTransaction, deleteTransaction } from "./actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ bulan?: string; catat?: string }> };

export default async function KasPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { bulan, catat } = await searchParams;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);
  const month = bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : currentMonth(tenant.timezone);
  const report = await getMonthlyReport(tenant.id, month);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Buku Kas Digital</h1>
          <p className="text-muted-foreground text-sm">Catat pemasukan & pengeluaran — otomatis tampil transparan di website.</p>
        </div>
        <form className="flex flex-wrap items-center gap-2" method="GET">
          <Input type="month" name="bulan" defaultValue={month} className="w-auto" />
          <Button type="submit" variant="outline">
            Tampilkan
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${slug}/admin/riwayat?jenis=kas`}>
              <History /> Riwayat
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${slug}/admin/kas/jumat`}>
              <Megaphone /> Laporan Jumat
            </Link>
          </Button>
          <Button asChild>
            <a href={`/${slug}/admin/kas/laporan?bulan=${month}`} target="_blank" rel="noreferrer">
              <FileDown /> PDF Bulanan
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/${slug}/admin/kas/ekspor?bulan=${month}`} download>
              <Sheet /> Excel
            </a>
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {report.funds.map((f) => (
          <Card key={f.fund} className="gap-3 py-5">
            <CardHeader className="px-5">
              <CardDescription>
                {FUND_LABELS[f.fund]} · {monthLabel(month)}
              </CardDescription>
              <CardTitle className="font-mono text-xl">{formatRupiah(f.closing)}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground grid grid-cols-3 gap-2 px-5 text-xs">
              <span>Saldo awal<br /><b className="text-foreground">{formatRupiah(f.opening)}</b></span>
              <span>Masuk<br /><b className="text-emerald-700">{formatRupiah(f.income)}</b></span>
              <span>Keluar<br /><b className="text-red-700">{formatRupiah(f.expense)}</b></span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Catat Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm
              key={catat ?? "biasa"}
              action={createTransaction.bind(null, slug)}
              today={todayISO(tenant.timezone)}
              defaults={
                catat === "infaq-jumat"
                  ? { category: "Infaq Jumat", transactionDate: fridayOnOrBefore(todayISO(tenant.timezone)) }
                  : undefined
              }
            />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Transaksi {monthLabel(month)}</CardTitle>
            <CardDescription>{report.transactions.length} transaksi</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Kas</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      Belum ada transaksi di bulan ini.
                    </TableCell>
                  </TableRow>
                )}
                {[...report.transactions].reverse().map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(t.transactionDate, "UTC", { month: "short" })}</TableCell>
                    <TableCell>
                      <p className="font-medium">{t.category}</p>
                      {t.description && <p className="text-muted-foreground text-xs">{t.description}</p>}
                      {t.receiptUrl && (
                        <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs hover:underline">
                          <Paperclip className="size-3" /> Bukti
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.fund === "OPERASIONAL" ? "Ops" : "Pemb."}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono whitespace-nowrap ${t.type === "IN" ? "text-emerald-700" : "text-red-700"}`}>
                      {t.type === "IN" ? "+" : "−"}
                      {formatRupiah(t.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex">
                        <Button asChild variant="ghost" size="icon" aria-label="Edit">
                          <Link href={`/${slug}/admin/kas/${t.id}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <DeleteButton action={deleteTransaction.bind(null, slug, t.id)} confirmText="Hapus transaksi ini?" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
