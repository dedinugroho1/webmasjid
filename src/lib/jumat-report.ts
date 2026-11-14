/**
 * Laporan kas pekanan (Sabtu–Jumat) yang lazim dibacakan sebelum khutbah
 * Jumat dan dibagikan ke grup WhatsApp jamaah. Fungsi murni.
 */
import type { CashFund, CashTransaction } from "@/db/schema";
import { FUND_LABELS } from "./constants";
import { formatDate, formatRupiah } from "./format";

type Tx = Pick<CashTransaction, "type" | "fund" | "category" | "amount" | "transactionDate">;

export type FundWeek = {
  fund: CashFund;
  opening: number;
  income: number;
  expense: number;
  closing: number;
  incomeByCategory: { category: string; amount: number }[];
  expenseByCategory: { category: string; amount: number }[];
};

export type JumatReport = {
  friday: string;
  start: string;
  funds: FundWeek[];
  /** Infaq Jumat yang dicatat tepat pada hari Jumat tersebut. */
  infaqJumat: number;
};

function groupByCategory(txs: Tx[]) {
  const map = new Map<string, number>();
  for (const t of txs) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function buildJumatReport(
  friday: string,
  start: string,
  openingByFund: Record<CashFund, number>,
  weekTxs: Tx[],
): JumatReport {
  const funds = (Object.keys(openingByFund) as CashFund[]).map((fund) => {
    const txs = weekTxs.filter((t) => t.fund === fund);
    const ins = txs.filter((t) => t.type === "IN");
    const outs = txs.filter((t) => t.type === "OUT");
    const income = ins.reduce((s, t) => s + t.amount, 0);
    const expense = outs.reduce((s, t) => s + t.amount, 0);
    return {
      fund,
      opening: openingByFund[fund],
      income,
      expense,
      closing: openingByFund[fund] + income - expense,
      incomeByCategory: groupByCategory(ins),
      expenseByCategory: groupByCategory(outs),
    };
  });
  const infaqJumat = weekTxs
    .filter((t) => t.type === "IN" && t.category === "Infaq Jumat" && t.transactionDate === friday)
    .reduce((s, t) => s + t.amount, 0);
  return { friday, start, funds, infaqJumat };
}

/** Teks siap dibacakan / dikirim ke WhatsApp. */
export function jumatReportText(masjidName: string, r: JumatReport) {
  const rp = (n: number) => formatRupiah(n).replace(/\s/g, " ");
  const lines = [
    `*LAPORAN KAS ${masjidName.toUpperCase()}*`,
    `Jumat, ${formatDate(r.friday)}`,
    `(Pekan ${formatDate(r.start, "UTC", { day: "numeric", month: "short" })} – ${formatDate(r.friday, "UTC", { day: "numeric", month: "short" })})`,
    "",
  ];
  for (const f of r.funds) {
    const empty = f.opening === 0 && f.income === 0 && f.expense === 0;
    if (empty && f.fund !== "OPERASIONAL") continue;
    lines.push(`*${FUND_LABELS[f.fund]}*`);
    lines.push(`Saldo pekan lalu: ${rp(f.opening)}`);
    lines.push(`Pemasukan: ${rp(f.income)}`);
    for (const c of f.incomeByCategory) lines.push(`  • ${c.category}: ${rp(c.amount)}`);
    lines.push(`Pengeluaran: ${rp(f.expense)}`);
    for (const c of f.expenseByCategory) lines.push(`  • ${c.category}: ${rp(c.amount)}`);
    lines.push(`*Saldo saat ini: ${rp(f.closing)}*`);
    lines.push("");
  }
  if (r.infaqJumat > 0) lines.push(`Infaq Jumat hari ini: ${rp(r.infaqJumat)}`, "");
  lines.push("Jazakumullahu khairan atas infaq jamaah. Semoga menjadi amal jariyah.");
  return lines.join("\n");
}
