import type { JumatReport } from "@/lib/jumat-report";
import { formatDate, formatRupiah } from "@/lib/format";

/** Laporan kas operasional pekan Jumat terakhir — seperti yang dibacakan sebelum khutbah. */
export function JumatReportCard({ report }: { report: JumatReport }) {
  const ops = report.funds.find((f) => f.fund === "OPERASIONAL")!;
  const row = (label: string, value: string, cls = "") => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${cls}`}>{value}</span>
    </div>
  );
  return (
    <div className="bg-card rounded-xl border p-5">
      <p className="text-muted-foreground text-xs font-medium uppercase">Laporan kas Jumat</p>
      <p className="font-bold">{formatDate(report.friday, "UTC", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="mt-3 divide-y text-sm">
        {row("Saldo pekan lalu", formatRupiah(ops.opening))}
        {row("Pemasukan pekan ini", `+${formatRupiah(ops.income)}`, "text-emerald-700")}
        {report.infaqJumat > 0 && row("— di antaranya Infaq Jumat", formatRupiah(report.infaqJumat), "text-emerald-700")}
        {row("Pengeluaran pekan ini", `−${formatRupiah(ops.expense)}`, "text-red-700")}
        {row("Saldo akhir", formatRupiah(ops.closing))}
      </div>
    </div>
  );
}
