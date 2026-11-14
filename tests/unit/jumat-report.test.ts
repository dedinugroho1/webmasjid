import { describe, expect, it } from "vitest";
import { buildJumatReport, jumatReportText } from "@/lib/jumat-report";

const tx = (type: "IN" | "OUT", category: string, amount: number, date = "2026-11-18", fund: "OPERASIONAL" | "PEMBANGUNAN" = "OPERASIONAL") => ({
  type,
  fund,
  category,
  amount,
  transactionDate: date,
});

describe("laporan kas Jumat", () => {
  const report = buildJumatReport("2026-11-20", "2026-11-14", { OPERASIONAL: 1_000_000, PEMBANGUNAN: 0 }, [
    tx("IN", "Infaq Jumat", 2_000_000, "2026-11-20"),
    tx("IN", "Kotak Amal Harian", 300_000),
    tx("IN", "Kotak Amal Harian", 200_000),
    tx("OUT", "Listrik", 450_000),
    tx("IN", "Infaq Jumat", 999, "2026-11-14"), // bukan hari Jumat laporan
  ]);

  it("menghitung saldo & rincian per kategori", () => {
    const ops = report.funds.find((f) => f.fund === "OPERASIONAL")!;
    expect(ops.income).toBe(2_500_999);
    expect(ops.expense).toBe(450_000);
    expect(ops.closing).toBe(1_000_000 + 2_500_999 - 450_000);
    expect(ops.incomeByCategory[0]).toEqual({ category: "Infaq Jumat", amount: 2_000_999 });
    expect(ops.incomeByCategory[1]).toEqual({ category: "Kotak Amal Harian", amount: 500_000 });
    expect(report.infaqJumat).toBe(2_000_000);
  });

  it("teks siap dibacakan; kas pembangunan kosong disembunyikan", () => {
    const text = jumatReportText("Masjid Al-Ikhlas", report);
    expect(text).toContain("*LAPORAN KAS MASJID AL-IKHLAS*");
    expect(text).toContain("Jumat, 20 November 2026");
    expect(text).toContain("Saldo pekan lalu: Rp 1.000.000");
    expect(text).toContain("• Listrik: Rp 450.000");
    expect(text).toContain("Infaq Jumat hari ini: Rp 2.000.000");
    expect(text).not.toContain("Kas Pembangunan");
  });
});
