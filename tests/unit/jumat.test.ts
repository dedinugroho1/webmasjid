import { describe, expect, it } from "vitest";
import {
  addDays,
  fridayOnOrAfter,
  fridayOnOrBefore,
  fridaysInMonth,
  isFridayISO,
  jumatWeek,
  kajianOccursOn,
  nextKajianDate,
  upcomingFridays,
} from "@/lib/jumat";

describe("tanggal Jumat", () => {
  it("menghitung Jumat sebelum/sesudah", () => {
    expect(isFridayISO("2026-11-20")).toBe(true);
    expect(isFridayISO("2026-11-21")).toBe(false);
    expect(fridayOnOrAfter("2026-11-14")).toBe("2026-11-20"); // Sabtu → Jumat depan
    expect(fridayOnOrAfter("2026-11-20")).toBe("2026-11-20");
    expect(fridayOnOrBefore("2026-11-19")).toBe("2026-11-13");
    expect(fridayOnOrBefore("2026-11-20")).toBe("2026-11-20");
  });

  it("melewati pergantian bulan & tahun", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(upcomingFridays("Asia/Jakarta", 3, "2026-12-26")).toEqual(["2027-01-01", "2027-01-08", "2027-01-15"]);
  });

  it("pekan laporan: Sabtu s.d. Jumat", () => {
    expect(jumatWeek("2026-11-20")).toEqual({ start: "2026-11-14", end: "2026-11-21" });
  });

  it("Jumat dalam satu bulan", () => {
    expect(fridaysInMonth("2026-11")).toEqual(["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27"]);
    expect(fridaysInMonth("2027-01")).toHaveLength(5);
  });
});

describe("kajian rutin", () => {
  const ahad = { dayOfWeek: 0, frequency: "SETIAP_PEKAN" as const };
  it("setiap pekan", () => {
    expect(kajianOccursOn(ahad, "2026-11-15")).toBe(true);
    expect(kajianOccursOn(ahad, "2026-11-16")).toBe(false);
  });

  it("pekan ke-1 & ke-3 / ke-2 & ke-4 / bulanan", () => {
    // Ahad di November 2026: 1, 8, 15, 22, 29
    const k13 = { dayOfWeek: 0, frequency: "PEKAN_1_3" as const };
    const k24 = { dayOfWeek: 0, frequency: "PEKAN_2_4" as const };
    const k1 = { dayOfWeek: 0, frequency: "SEBULAN_SEKALI" as const };
    expect(["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"].map((d) => kajianOccursOn(k13, d))).toEqual([
      true, false, true, false, false,
    ]);
    expect(kajianOccursOn(k24, "2026-11-22")).toBe(true);
    expect(nextKajianDate(k1, "2026-11-02")).toBe("2026-12-06");
  });
});
