import { describe, expect, it } from "vitest";
import { describeTransaction, diffTransaction, snapshotTransaction, summarizeTransaction, type TxSnapshot } from "@/lib/audit";

const base: TxSnapshot = {
  type: "IN",
  fund: "OPERASIONAL",
  category: "Infaq Jumat",
  amount: 2_500_000,
  description: "Kotak Jumat",
  transactionDate: "2026-11-13",
  receipt: false,
};

describe("snapshotTransaction", () => {
  it("menyalin field penting, bukti hanya sebagai ada/tidak, keterangan kosong → null", () => {
    const snap = snapshotTransaction({
      type: "OUT",
      fund: "PEMBANGUNAN",
      category: "Material",
      amount: 1000,
      description: "   ",
      transactionDate: "2026-01-02",
      receiptUrl: "https://cdn.example/x.png",
    });
    expect(snap).toEqual({
      type: "OUT",
      fund: "PEMBANGUNAN",
      category: "Material",
      amount: 1000,
      description: null,
      transactionDate: "2026-01-02",
      receipt: true,
    });
  });
});

describe("diffTransaction", () => {
  it("tanpa perubahan → kosong", () => {
    expect(diffTransaction(base, { ...base })).toEqual([]);
  });

  it("menampilkan nilai lama → baru dalam teks mudah dibaca", () => {
    const changes = diffTransaction(base, {
      ...base,
      amount: 3_000_000,
      type: "OUT",
      fund: "PEMBANGUNAN",
      description: null,
      transactionDate: "2026-11-20",
      receipt: true,
    });
    const byField = Object.fromEntries(changes.map((c) => [c.field, `${c.from} → ${c.to}`]));
    expect(byField.amount).toBe("Rp 2.500.000 → Rp 3.000.000");
    expect(byField.type).toBe("Pemasukan → Pengeluaran");
    expect(byField.fund).toBe("Kas Operasional → Kas Pembangunan");
    expect(byField.description).toBe("Kotak Jumat → —");
    expect(byField.transactionDate).toBe("13 November 2026 → 20 November 2026");
    expect(byField.receipt).toBe("tidak ada → ada");
    expect(changes.map((c) => c.field)).not.toContain("category");
  });
});

describe("summarizeTransaction", () => {
  it("tambah dan hapus memuat jenis, nominal, kategori, keterangan, dan tanggal", () => {
    expect(describeTransaction(base)).toBe("pemasukan Rp 2.500.000 · Infaq Jumat (Kotak Jumat) · 13 November 2026");
    expect(summarizeTransaction("CREATE", base)).toBe("Menambah pemasukan Rp 2.500.000 · Infaq Jumat (Kotak Jumat) · 13 November 2026");
    expect(summarizeTransaction("DELETE", { ...base, description: null })).toBe("Menghapus pemasukan Rp 2.500.000 · Infaq Jumat · 13 November 2026");
  });

  it("ubah menyebut kategori dan setiap perubahan", () => {
    const after = { ...base, amount: 2_000_000, category: "Kotak Amal Harian" };
    const text = summarizeTransaction("UPDATE", after, diffTransaction(base, after));
    expect(text).toBe("Mengubah pemasukan Kotak Amal Harian: kategori Infaq Jumat → Kotak Amal Harian; nominal Rp 2.500.000 → Rp 2.000.000");
  });
});
