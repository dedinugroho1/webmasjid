/**
 * Perhitungan jadwal sholat berbasis koordinat (library `adhan`).
 * Dipakai di server maupun client (pure JS, tanpa API eksternal).
 */
import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes, Rounding } from "adhan";
import { zonedParts } from "./format";

export const CALCULATION_METHODS = {
  KEMENAG: "Kemenag RI (Subuh 20°, Isya 18° + ihtiyat)",
  SINGAPORE: "MUIS Singapura (20° / 18°)",
  MWL: "Muslim World League (18° / 17°)",
  UMM_AL_QURA: "Umm al-Qura, Makkah",
  EGYPTIAN: "Egyptian General Authority",
  KARACHI: "University of Islamic Sciences, Karachi",
} as const;

export type CalculationMethodKey = keyof typeof CALCULATION_METHODS;

export type PrayerKey = "imsak" | "subuh" | "syuruq" | "dzuhur" | "ashar" | "maghrib" | "isya";

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  imsak: "Imsak",
  subuh: "Subuh",
  syuruq: "Syuruq",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

/** Waktu sholat wajib (tanpa imsak & syuruq) — punya adzan & iqomah. */
export const FARDH_PRAYERS: PrayerKey[] = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

export type PrayerConfig = {
  latitude: number;
  longitude: number;
  timezone: string;
  method?: string;
};

export type PrayerSchedule = { key: PrayerKey; label: string; time: Date }[];

function getParams(method?: string): CalculationParameters {
  switch (method as CalculationMethodKey) {
    case "SINGAPORE":
      return CalculationMethod.Singapore();
    case "MWL":
      return CalculationMethod.MuslimWorldLeague();
    case "UMM_AL_QURA":
      return CalculationMethod.UmmAlQura();
    case "EGYPTIAN":
      return CalculationMethod.Egyptian();
    case "KARACHI":
      return CalculationMethod.Karachi();
    case "KEMENAG":
    default: {
      // Kriteria Kemenag RI: tinggi matahari Subuh -20°, Isya -18°,
      // ditambah ihtiyat (kehati-hatian) ±2 menit. Silakan cocokkan dengan
      // jadwal resmi Kemenag/Bimas Islam setempat.
      const p = new CalculationParameters("Other", 20, 18);
      p.methodAdjustments = { fajr: 2, sunrise: -2, dhuhr: 3, asr: 2, maghrib: 2, isha: 2 };
      p.rounding = Rounding.Up;
      return p;
    }
  }
}

/**
 * Jadwal sholat untuk tanggal kalender (di zona waktu masjid) yang memuat `at`.
 * `adhan` membaca komponen tanggal lokal runtime, sehingga kita bentuk Date
 * dari komponen Y/M/D zona waktu masjid agar benar walau server ber-zona UTC.
 */
export function getPrayerSchedule(config: PrayerConfig, at: Date = new Date(), dayOffset = 0): PrayerSchedule {
  const { year, month, day } = zonedParts(at, config.timezone);
  const date = new Date(year, month - 1, day + dayOffset);
  const params = getParams(config.method);
  params.madhab = Madhab.Shafi;
  const pt = new PrayerTimes(new Coordinates(config.latitude, config.longitude), date, params);
  const imsak = new Date(pt.fajr.getTime() - 10 * 60_000);
  const times: Record<PrayerKey, Date> = {
    imsak,
    subuh: pt.fajr,
    syuruq: pt.sunrise,
    dzuhur: pt.dhuhr,
    ashar: pt.asr,
    maghrib: pt.maghrib,
    isya: pt.isha,
  };
  return (Object.keys(PRAYER_LABELS) as PrayerKey[]).map((key) => ({
    key,
    label: key === "dzuhur" && isFriday(at, config.timezone, dayOffset) ? "Jumat" : PRAYER_LABELS[key],
    time: times[key],
  }));
}

export function isFriday(at: Date, timeZone: string, dayOffset = 0) {
  const { year, month, day } = zonedParts(at, timeZone);
  return new Date(Date.UTC(year, month - 1, day + dayOffset)).getUTCDay() === 5;
}

/** Waktu sholat wajib berikutnya (bisa jatuh di hari esok — Subuh). */
export function getNextPrayer(config: PrayerConfig, now: Date = new Date()) {
  const today = getPrayerSchedule(config, now).filter((p) => FARDH_PRAYERS.includes(p.key));
  const next = today.find((p) => p.time.getTime() > now.getTime());
  if (next) return next;
  return getPrayerSchedule(config, now, 1).find((p) => p.key === "subuh")!;
}

/** Waktu sholat wajib yang terakhir sudah masuk (untuk fase adzan/iqomah). */
export function getCurrentPrayer(config: PrayerConfig, now: Date = new Date()) {
  const today = getPrayerSchedule(config, now).filter((p) => FARDH_PRAYERS.includes(p.key));
  return [...today].reverse().find((p) => p.time.getTime() <= now.getTime()) ?? null;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
