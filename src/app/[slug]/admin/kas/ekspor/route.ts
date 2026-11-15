import { FUND_LABELS } from "@/lib/constants";
import { toCsv, type CsvCell } from "@/lib/csv";
import { getMonthlyReport, listTransactions } from "@/lib/finance";
import { currentMonth, monthLabel } from "@/lib/format";
import { checkTenantAccess } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /{slug}/admin/kas/ekspor?bulan=YYYY-MM | semua
 * → CSV buku kas yang bisa dibuka di Excel / Google Sheets.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await checkTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);
  if (!access) return new Response("Tidak diizinkan", { status: 403 });
  const { tenant } = access;

  const bulan = new URL(request.url).searchParams.get("bulan");
  const all = bulan === "semua";
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : currentMonth(tenant.timezone);

  const rows: CsvCell[][] = [["Buku Kas", tenant.name], ["Periode", all ? "Semua transaksi" : monthLabel(month)], []];
  let transactions;

  if (all) {
    transactions = (await listTransactions(tenant.id, { limit: 100_000 })).reverse();
  } else {
    const report = await getMonthlyReport(tenant.id, month);
    rows.push(["Kas", "Saldo awal", "Pemasukan", "Pengeluaran", "Saldo akhir"]);
    for (const f of report.funds) rows.push([FUND_LABELS[f.fund], f.opening, f.income, f.expense, f.closing]);
    rows.push([]);
    transactions = report.transactions;
  }

  rows.push(["Tanggal", "Jenis", "Kas", "Kategori", "Keterangan", "Pemasukan", "Pengeluaran"]);
  for (const t of transactions) {
    rows.push([
      t.transactionDate,
      t.type === "IN" ? "Pemasukan" : "Pengeluaran",
      FUND_LABELS[t.fund],
      t.category,
      t.description ?? "",
      t.type === "IN" ? t.amount : "",
      t.type === "OUT" ? t.amount : "",
    ]);
  }

  const filename = `kas-${tenant.slug}-${all ? "semua" : month}.csv`;
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
