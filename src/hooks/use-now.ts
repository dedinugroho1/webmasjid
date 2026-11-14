"use client";

import { useEffect, useState } from "react";

/**
 * Waktu sekarang yang diperbarui tiap `intervalMs`. Bernilai `null` saat
 * render server/pertama agar tidak terjadi hydration mismatch.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
