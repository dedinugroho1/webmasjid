import { describe, expect, it } from "vitest";
import { formatTime } from "@/lib/format";
import { getCurrentPrayer, getNextPrayer, getPrayerSchedule, iqomahFor, isFriday, formatCountdown } from "@/lib/prayer";

const jakarta = { latitude: -6.2088, longitude: 106.8456, timezone: "Asia/Jakarta", method: "KEMENAG" };
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const times = (cfg: Parameters<typeof getPrayerSchedule>[0], at: Date) =>
  Object.fromEntries(getPrayerSchedule(cfg, at).map((p) => [p.key, formatTime(p.time, cfg.timezone)]));

describe("getPrayerSchedule", () => {
  // 15 Nov 2026, 05:30 WIB (= 14 Nov 22:30 UTC — tanggal UTC berbeda!)
  const at = new Date("2026-11-14T22:30:00Z");

  it("mendekati jadwal Kemenag Jakarta (toleransi 3 menit)", () => {
    const t = times(jakarta, at);
    const reference = { subuh: "04:05", syuruq: "05:23", dzuhur: "11:40", ashar: "15:02", maghrib: "17:53", isya: "19:06" };
    for (const [key, ref] of Object.entries(reference)) {
      expect(Math.abs(toMinutes(t[key]) - toMinutes(ref)), key).toBeLessThanOrEqual(3);
    }
  });

  it("memakai tanggal zona waktu masjid, bukan tanggal UTC server", () => {
    const sameDayWib = new Date("2026-11-15T03:00:00Z"); // 10:00 WIB, 15 Nov
    expect(times(jakarta, at)).toEqual(times(jakarta, sameDayWib));
  });

  it("imsak = subuh − 10 menit", () => {
    const s = getPrayerSchedule(jakarta, at);
    const imsak = s.find((p) => p.key === "imsak")!.time.getTime();
    const subuh = s.find((p) => p.key === "subuh")!.time.getTime();
    expect(subuh - imsak).toBe(10 * 60_000);
  });

  it("menerapkan koreksi per waktu & membatasi ±30 menit", () => {
    const base = getPrayerSchedule(jakarta, at);
    const adjusted = getPrayerSchedule({ ...jakarta, adjustments: { subuh: 2, maghrib: -1, isya: 99 } }, at);
    const diff = (k: string) =>
      (adjusted.find((p) => p.key === k)!.time.getTime() - base.find((p) => p.key === k)!.time.getTime()) / 60_000;
    expect(diff("subuh")).toBe(2);
    expect(diff("imsak")).toBe(2);
    expect(diff("maghrib")).toBe(-1);
    expect(diff("isya")).toBe(30);
    expect(diff("dzuhur")).toBe(0);
  });

  it("memberi label Jumat untuk dzuhur di hari Jumat", () => {
    const friday = new Date("2026-11-20T03:00:00Z"); // Jumat 10:00 WIB
    expect(isFriday(friday, "Asia/Jakarta")).toBe(true);
    expect(getPrayerSchedule(jakarta, friday).find((p) => p.key === "dzuhur")!.label).toBe("Jumat");
    expect(getPrayerSchedule(jakarta, at).find((p) => p.key === "dzuhur")!.label).toBe("Dzuhur");
  });

  it("menghitung zona WIT dengan benar (Jayapura)", () => {
    const jayapura = { latitude: -2.5337, longitude: 140.7181, timezone: "Asia/Jayapura" };
    const t = times(jayapura, at);
    expect(toMinutes(t.subuh)).toBeGreaterThan(toMinutes("03:30"));
    expect(toMinutes(t.subuh)).toBeLessThan(toMinutes("04:30"));
    // 140,7° BT berada di timur meridian WIT (135°) → maghrib ±17:30.
    expect(toMinutes(t.maghrib)).toBeGreaterThan(toMinutes("17:15"));
    expect(toMinutes(t.maghrib)).toBeLessThan(toMinutes("17:50"));
  });
});

describe("getNextPrayer / getCurrentPrayer", () => {
  it("setelah isya, waktu berikutnya adalah subuh esok hari", () => {
    const night = new Date("2026-11-15T15:00:00Z"); // 22:00 WIB
    const next = getNextPrayer(jakarta, night);
    expect(next.key).toBe("subuh");
    expect(next.time.getTime()).toBeGreaterThan(night.getTime());
    expect(getCurrentPrayer(jakarta, night)?.key).toBe("isya");
  });

  it("sebelum subuh tidak ada waktu sholat berjalan", () => {
    const early = new Date("2026-11-14T20:00:00Z"); // 03:00 WIB
    expect(getCurrentPrayer(jakarta, early)).toBeNull();
    expect(getNextPrayer(jakarta, early).key).toBe("subuh");
  });
});

describe("iqomahFor & formatCountdown", () => {
  it("memakai nilai per waktu, lalu fallback ke bawaan", () => {
    const cfg = { iqomahOffsetMinutes: 10, iqomahMinutes: { subuh: 15, maghrib: 5 } };
    expect(iqomahFor(cfg, "subuh")).toBe(15);
    expect(iqomahFor(cfg, "maghrib")).toBe(5);
    expect(iqomahFor(cfg, "isya")).toBe(10);
  });

  it("format hitung mundur", () => {
    expect(formatCountdown(65_000)).toBe("01:05");
    expect(formatCountdown(3_725_000)).toBe("01:02:05");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});
