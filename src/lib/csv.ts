/**
 * Pembuat CSV yang ramah Excel berbahasa Indonesia:
 * - pemisah ";" (Excel id-ID memakai koma sebagai desimal),
 * - BOM UTF-8 agar huruf non-ASCII terbaca benar,
 * - CRLF sebagai akhir baris.
 */
export type CsvCell = string | number | null | undefined;

const SEPARATOR = ";";

function escapeCell(value: CsvCell) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Cegah formula injection saat dibuka di Excel/Sheets.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value !== "number" ? `'${text}` : text;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: CsvCell[][]) {
  return "﻿" + rows.map((r) => r.map(escapeCell).join(SEPARATOR)).join("\r\n") + "\r\n";
}
