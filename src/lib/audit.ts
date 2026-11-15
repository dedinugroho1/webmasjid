/**
 * Logika murni riwayat perubahan Buku Kas: potret (snapshot) transaksi,
 * perbandingan sebelum/sesudah, dan ringkasan satu kalimat berbahasa Indonesia.
 */
import type { CashTransaction } from "@/db/schema";
import { FUND_LABELS } from "./constants";
import { formatDate, formatRupiah } from "./format";

export type TxSnapshot = {
  type: "IN" | "OUT";
  fund: "OPERASIONAL" | "PEMBANGUNAN";
  category: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  /** Ada bukti/nota terlampir atau tidak (URL-nya sendiri tidak disimpan di riwayat). */
  receipt: boolean;
};

export type FieldChange = { field: keyof TxSnapshot; label: string; from: string; to: string };

const LABELS: Record<keyof TxSnapshot, string> = {
  type: "jenis",
  fund: "kas",
  category: "kategori",
  amount: "nominal",
  description: "keterangan",
  transactionDate: "tanggal",
  receipt: "bukti",
};

const plain = (s: string) => s.replace(/ /g, " ");

export function snapshotTransaction(
  row: Pick<CashTransaction, "type" | "fund" | "category" | "amount" | "description" | "transactionDate" | "receiptUrl">,
): TxSnapshot {
  return {
    type: row.type,
    fund: row.fund,
    category: row.category,
    amount: row.amount,
    description: row.description?.trim() || null,
    transactionDate: row.transactionDate,
    receipt: Boolean(row.receiptUrl),
  };
}

function show<K extends keyof TxSnapshot>(field: K, snap: TxSnapshot): string {
  switch (field) {
    case "type":
      return snap.type === "IN" ? "Pemasukan" : "Pengeluaran";
    case "fund":
      return FUND_LABELS[snap.fund];
    case "amount":
      return plain(formatRupiah(snap.amount));
    case "transactionDate":
      return formatDate(snap.transactionDate);
    case "description":
      return snap.description ?? "—";
    case "receipt":
      return snap.receipt ? "ada" : "tidak ada";
    default:
      return String(snap[field]);
  }
}

/** Daftar field yang berubah, sudah dalam teks yang mudah dibaca. */
export function diffTransaction(before: TxSnapshot, after: TxSnapshot): FieldChange[] {
  return (Object.keys(LABELS) as (keyof TxSnapshot)[])
    .filter((f) => before[f] !== after[f])
    .map((f) => ({ field: f, label: LABELS[f], from: show(f, before), to: show(f, after) }));
}

const kind = (s: TxSnapshot) => (s.type === "IN" ? "pemasukan" : "pengeluaran");

/** "pemasukan Rp 2.500.000 · Infaq Jumat · 13 November 2026" */
export function describeTransaction(s: TxSnapshot) {
  const note = s.description ? ` (${s.description})` : "";
  return `${kind(s)} ${plain(formatRupiah(s.amount))} · ${s.category}${note} · ${formatDate(s.transactionDate)}`;
}

export function summarizeTransaction(action: "CREATE" | "UPDATE" | "DELETE", snap: TxSnapshot, changes: FieldChange[] = []) {
  if (action === "CREATE") return `Menambah ${describeTransaction(snap)}`;
  if (action === "DELETE") return `Menghapus ${describeTransaction(snap)}`;
  const what = changes.map((c) => `${c.label} ${c.from} → ${c.to}`).join("; ");
  return `Mengubah ${kind(snap)} ${snap.category}: ${what}`;
}
