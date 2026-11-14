/**
 * Utilitas tanggal untuk Jumat & kajian rutin. Semua tanggal berupa string
 * "YYYY-MM-DD" (kalender lokal masjid) dan dihitung dengan aritmetika UTC
 * agar tidak terpengaruh zona waktu server.
 */
import type { KajianFrequency } from "@/db/schema";
import { todayISO } from "./format";

export const DAY_NAMES = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export const FREQUENCY_LABELS: Record<KajianFrequency, string> = {
  SETIAP_PEKAN: "Setiap pekan",
  PEKAN_1_3: "Pekan ke-1 & ke-3",
  PEKAN_2_4: "Pekan ke-2 & ke-4",
  SEBULAN_SEKALI: "Sebulan sekali (pekan ke-1)",
};

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function dayOfWeek(iso: string) {
  return toDate(iso).getUTCDay();
}

export function isFridayISO(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && dayOfWeek(iso) === 5;
}

/** Jumat pada atau sesudah tanggal ini. */
export function fridayOnOrAfter(iso: string) {
  return addDays(iso, (5 - dayOfWeek(iso) + 7) % 7);
}

/** Jumat pada atau sebelum tanggal ini. */
export function fridayOnOrBefore(iso: string) {
  return addDays(iso, -((dayOfWeek(iso) - 5 + 7) % 7));
}

/** `count` Jumat mulai Jumat ini (atau berikutnya) di zona waktu masjid. */
export function upcomingFridays(timeZone: string, count = 8, from = todayISO(timeZone)) {
  const first = fridayOnOrAfter(from);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/** Pekan laporan kas Jumat: Sabtu sebelumnya s.d. Jumat (end eksklusif = Sabtu berikutnya). */
export function jumatWeek(friday: string) {
  return { start: addDays(friday, -6), end: addDays(friday, 1) };
}

/** Semua Jumat dalam satu bulan "YYYY-MM". */
export function fridaysInMonth(ym: string) {
  const first = fridayOnOrAfter(`${ym}-01`);
  const out: string[] = [];
  for (let d = first; d.startsWith(ym); d = addDays(d, 7)) out.push(d);
  return out;
}

/** Urutan pekan (1–5) dari tanggal dalam bulannya, mis. Ahad ke-2. */
export function weekOfMonth(iso: string) {
  return Math.ceil(toDate(iso).getUTCDate() / 7);
}

/** Apakah kajian rutin berlangsung pada tanggal tersebut. */
export function kajianOccursOn(k: { dayOfWeek: number; frequency: KajianFrequency }, iso: string) {
  if (dayOfWeek(iso) !== k.dayOfWeek) return false;
  const w = weekOfMonth(iso);
  switch (k.frequency) {
    case "SETIAP_PEKAN":
      return true;
    case "PEKAN_1_3":
      return w === 1 || w === 3;
    case "PEKAN_2_4":
      return w === 2 || w === 4;
    case "SEBULAN_SEKALI":
      return w === 1;
  }
}

/** Tanggal pelaksanaan berikutnya (hari ini termasuk) dalam 70 hari ke depan. */
export function nextKajianDate(k: { dayOfWeek: number; frequency: KajianFrequency }, from: string) {
  for (let i = 0; i < 70; i++) {
    const d = addDays(from, i);
    if (kajianOccursOn(k, d)) return d;
  }
  return null;
}
