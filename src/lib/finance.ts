import "server-only";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { cashTransactions, type CashFund } from "@/db/schema";

export type FundSummary = Record<CashFund, { income: number; expense: number; balance: number }>;

const emptySummary = (): FundSummary => ({
  OPERASIONAL: { income: 0, expense: 0, balance: 0 },
  PEMBANGUNAN: { income: 0, expense: 0, balance: 0 },
});

async function aggregate(tenantId: string, from?: string, to?: string): Promise<FundSummary> {
  const conds = [eq(cashTransactions.tenantId, tenantId)];
  if (from) conds.push(gte(cashTransactions.transactionDate, from));
  if (to) conds.push(lt(cashTransactions.transactionDate, to));

  const rows = await db
    .select({
      fund: cashTransactions.fund,
      income: sql<string>`coalesce(sum(case when ${cashTransactions.type} = 'IN' then ${cashTransactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${cashTransactions.type} = 'OUT' then ${cashTransactions.amount} else 0 end), 0)`,
    })
    .from(cashTransactions)
    .where(and(...conds))
    .groupBy(cashTransactions.fund);

  const summary = emptySummary();
  for (const r of rows) {
    const income = Number(r.income);
    const expense = Number(r.expense);
    summary[r.fund] = { income, expense, balance: income - expense };
  }
  return summary;
}

/** Saldo seluruh waktu per jenis kas. */
export function getBalances(tenantId: string) {
  return aggregate(tenantId);
}

/** Rentang [awal bulan, awal bulan berikutnya) untuk "YYYY-MM". */
export function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const end = `${ny}-${String(nm).padStart(2, "0")}-01`;
  return { start, end };
}

export async function listTransactions(tenantId: string, opts: { month?: string; limit?: number } = {}) {
  const conds = [eq(cashTransactions.tenantId, tenantId)];
  if (opts.month) {
    const { start, end } = monthRange(opts.month);
    conds.push(gte(cashTransactions.transactionDate, start), lt(cashTransactions.transactionDate, end));
  }
  return db
    .select()
    .from(cashTransactions)
    .where(and(...conds))
    .orderBy(desc(cashTransactions.transactionDate), desc(cashTransactions.createdAt))
    .limit(opts.limit ?? 500);
}

/** Data laporan bulanan: saldo awal, mutasi bulan berjalan, saldo akhir per kas. */
export async function getMonthlyReport(tenantId: string, ym: string) {
  const { start, end } = monthRange(ym);
  const [opening, mutation, transactions] = await Promise.all([
    aggregate(tenantId, undefined, start),
    aggregate(tenantId, start, end),
    db
      .select()
      .from(cashTransactions)
      .where(
        and(
          eq(cashTransactions.tenantId, tenantId),
          gte(cashTransactions.transactionDate, start),
          lt(cashTransactions.transactionDate, end),
        ),
      )
      .orderBy(asc(cashTransactions.transactionDate), asc(cashTransactions.createdAt)),
  ]);

  const funds = (Object.keys(opening) as CashFund[]).map((fund) => ({
    fund,
    opening: opening[fund].balance,
    income: mutation[fund].income,
    expense: mutation[fund].expense,
    closing: opening[fund].balance + mutation[fund].income - mutation[fund].expense,
  }));

  return { month: ym, funds, transactions };
}
