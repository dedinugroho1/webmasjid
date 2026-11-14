import { describe, expect, it } from "vitest";
import {
  dateToLocalInput,
  formatRupiah,
  localInputToDate,
  monthLabel,
  tzOffsetMinutes,
  zonedParts,
} from "@/lib/format";
import { monthRange } from "@/lib/finance";

describe("format", () => {
  it("formatRupiah tanpa desimal", () => {
    expect(formatRupiah(1_500_000).replace(/\s/g, " ")).toBe("Rp 1.500.000");
  });

  it("offset zona waktu Indonesia", () => {
    expect(tzOffsetMinutes("Asia/Jakarta")).toBe(420);
    expect(tzOffsetMinutes("Asia/Makassar")).toBe(480);
    expect(tzOffsetMinutes("Asia/Jayapura")).toBe(540);
  });

  it.each(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"])("datetime-local bolak-balik (%s)", (tz) => {
    const d = localInputToDate("2026-12-01T19:30", tz);
    expect(dateToLocalInput(d, tz)).toBe("2026-12-01T19:30");
  });

  it("19:30 WIB = 12:30 UTC", () => {
    expect(localInputToDate("2026-12-01T19:30", "Asia/Jakarta").toISOString()).toBe("2026-12-01T12:30:00.000Z");
  });

  it("zonedParts melewati batas hari", () => {
    expect(zonedParts(new Date("2026-11-14T22:30:00Z"), "Asia/Jakarta")).toEqual({ year: 2026, month: 11, day: 15 });
  });

  it("monthLabel & monthRange (termasuk Desember)", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthRange("2026-11")).toEqual({ start: "2026-11-01", end: "2026-12-01" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});
