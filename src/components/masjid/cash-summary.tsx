import { ArrowDownLeft, ArrowUpRight, Building2, Wallet } from "lucide-react";
import type { CashTransaction } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FUND_LABELS } from "@/lib/constants";
import type { FundSummary } from "@/lib/finance";
import { formatDate, formatRupiah } from "@/lib/format";

/** Widget transparansi kas — dipakai di halaman publik masjid. */
export function CashSummary({ balances, recent }: { balances: FundSummary; recent: CashTransaction[] }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <BalanceCard icon={<Wallet />} title={FUND_LABELS.OPERASIONAL} data={balances.OPERASIONAL} />
        <BalanceCard icon={<Building2 />} title={FUND_LABELS.PEMBANGUNAN} data={balances.PEMBANGUNAN} />
      </div>
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Riwayat Transaksi Terbaru</CardTitle>
          <CardDescription>Dicatat langsung oleh bendahara DKM — terbuka untuk jamaah.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada transaksi tercatat.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        t.type === "IN"
                          ? "rounded-full bg-emerald-100 p-1.5 text-emerald-700"
                          : "rounded-full bg-red-100 p-1.5 text-red-700"
                      }
                    >
                      {t.type === "IN" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.category}
                        {t.description ? <span className="text-muted-foreground"> — {t.description}</span> : null}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(t.transactionDate)} ·{" "}
                        <Badge variant="outline" className="py-0 text-[10px]">
                          {FUND_LABELS[t.fund]}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  <p className={`shrink-0 font-mono text-sm font-semibold ${t.type === "IN" ? "text-emerald-700" : "text-red-700"}`}>
                    {t.type === "IN" ? "+" : "−"}
                    {formatRupiah(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceCard({
  icon,
  title,
  data,
}: {
  icon: React.ReactNode;
  title: string;
  data: { income: number; expense: number; balance: number };
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-2 [&_svg]:size-4">
          {icon} {title}
        </CardDescription>
        <CardTitle className="font-mono text-2xl">{formatRupiah(data.balance)}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground flex gap-4 text-xs">
        <span>Masuk: {formatRupiah(data.income)}</span>
        <span>Keluar: {formatRupiah(data.expense)}</span>
      </CardContent>
    </Card>
  );
}
