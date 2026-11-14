import type { CashFund, EventType, UserRole } from "@/db/schema";

export const INCOME_CATEGORIES = [
  "Infaq Jumat",
  "Kotak Amal Harian",
  "Transfer Donatur",
  "Zakat",
  "Wakaf",
  "Donasi Pembangunan",
  "Lainnya",
] as const;

export const EXPENSE_CATEGORIES = [
  "Listrik",
  "Air",
  "Honor Marbot",
  "Honor Ustadz / Khatib",
  "Perbaikan & Perawatan",
  "Kebersihan",
  "Kegiatan Sosial",
  "Material Pembangunan",
  "Lainnya",
] as const;

export const FUND_LABELS: Record<CashFund, string> = {
  OPERASIONAL: "Kas Operasional",
  PEMBANGUNAN: "Kas Pembangunan",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  KAJIAN: "Kajian / Tabligh Akbar",
  JUMAT: "Sholat Jumat",
  SOSIAL: "Kegiatan Sosial / PHBI",
};

/** Jenis agenda yang bisa dipilih (petugas Jumat punya menu sendiri). */
export const EVENT_TYPE_OPTIONS: EventType[] = ["KAJIAN", "SOSIAL"];

export const ROLE_LABELS: Record<UserRole, string> = {
  DKM_ADMIN: "Admin DKM",
  BENDAHARA: "Bendahara",
  SUPERADMIN: "Superadmin",
};

export const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB (Asia/Jakarta)" },
  { value: "Asia/Makassar", label: "WITA (Asia/Makassar)" },
  { value: "Asia/Jayapura", label: "WIT (Asia/Jayapura)" },
] as const;

export const DEFAULT_RUNNING_TEXT =
  "Luruskan dan rapatkan shaf | Harap non-aktifkan / silent handphone | Jagalah kebersihan masjid";
