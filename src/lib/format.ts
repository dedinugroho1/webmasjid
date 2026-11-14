/** Utilitas format angka & tanggal (locale Indonesia). */

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number) {
  return rupiah.format(value);
}

export function formatDate(value: Date | string, timeZone = "Asia/Jakarta", opts?: Intl.DateTimeFormatOptions) {
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    // tanggal murni (YYYY-MM-DD) disimpan tanpa zona waktu → tampilkan apa adanya (UTC)
    timeZone: typeof value === "string" && value.length === 10 ? "UTC" : timeZone,
    ...opts,
  }).format(d);
}

export function formatTime(value: Date, timeZone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  })
    .format(value)
    .replace(".", ":");
}

export function formatDateTime(value: Date, timeZone = "Asia/Jakarta") {
  return `${formatDate(value, timeZone, { weekday: "long" })}, ${formatTime(value, timeZone)}`;
}

/** Tanggal Hijriah (kalender Umm al-Qura) via Intl — tanpa dependensi tambahan. */
export function formatHijri(value: Date, timeZone = "Asia/Jakarta") {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    }).format(value);
  } catch {
    return "";
  }
}

/** Komponen tanggal (Y/M/D) pada zona waktu tertentu. */
export function zonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "YYYY-MM-DD" hari ini pada zona waktu masjid. */
export function todayISO(timeZone = "Asia/Jakarta") {
  const { year, month, day } = zonedParts(new Date(), timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM" bulan berjalan pada zona waktu masjid. */
export function currentMonth(timeZone = "Asia/Jakarta") {
  return todayISO(timeZone).slice(0, 7);
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Offset (menit) zona waktu terhadap UTC pada instan tertentu, mis. Asia/Jakarta = +420. */
export function tzOffsetMinutes(timeZone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** Ubah input "YYYY-MM-DDTHH:mm" (waktu lokal masjid) menjadi Date (UTC). */
export function localInputToDate(value: string, timeZone: string) {
  const [d, t] = value.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = (t ?? "00:00").split(":").map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, da, h, mi));
  const offset = tzOffsetMinutes(timeZone, guess);
  return new Date(guess.getTime() - offset * 60000);
}

/** Kebalikan dari `localInputToDate` untuk nilai default <input type="datetime-local">. */
export function dateToLocalInput(value: Date, timeZone: string) {
  const offset = tzOffsetMinutes(timeZone, value);
  return new Date(value.getTime() + offset * 60000).toISOString().slice(0, 16);
}
