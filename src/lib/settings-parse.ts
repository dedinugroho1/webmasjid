/**
 * Parser murni untuk form Pengaturan Masjid (mudah diuji unit).
 */
import type { BankAccount, IqomahMinutes, PrayerAdjustments } from "@/db/schema";
import { ADJUSTABLE_PRAYERS, FARDH_PRAYERS, MAX_ADJUSTMENT } from "./prayer";

/** Baca koreksi per waktu (adj_subuh, …) & iqomah per waktu (iqomah_subuh, …). */
export function parsePrayerTuning(formData: FormData) {
  const errors: Record<string, string[]> = {};
  const num = (name: string, min: number, max: number) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (raw === "") return 0;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors[name] = [`Isi bilangan bulat ${min} s.d. ${max}`];
      return 0;
    }
    return n;
  };
  const adjustments: PrayerAdjustments = {};
  for (const k of ADJUSTABLE_PRAYERS) {
    const v = num(`adj_${k}`, -MAX_ADJUSTMENT, MAX_ADJUSTMENT);
    if (v) adjustments[k as keyof PrayerAdjustments] = v;
  }
  const iqomahMinutes: IqomahMinutes = {};
  for (const k of FARDH_PRAYERS) {
    iqomahMinutes[k as keyof IqomahMinutes] = num(`iqomah_${k}`, 0, 60);
  }
  return { adjustments, iqomahMinutes, errors };
}

/** Format per baris: "Bank | Nomor Rekening | Atas Nama". */
export function parseBankAccounts(input?: string): BankAccount[] {
  return (input ?? "")
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter((p) => p.length >= 3 && p[0] && p[1])
    .slice(0, 10)
    .map(([bank, number, holder]) => ({ bank, number, holder }));
}

