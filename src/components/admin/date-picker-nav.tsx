"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

/** Input tanggal/bulan yang langsung berpindah halaman saat diganti. */
export function DatePickerNav({ type, value, param, basePath, label }: { type: "date" | "month"; value: string; param: string; basePath: string; label: string }) {
  const router = useRouter();
  return (
    <Input
      type={type}
      value={value}
      aria-label={label}
      className="w-auto"
      onChange={(e) => e.target.value && router.push(`${basePath}?${param}=${e.target.value}`)}
    />
  );
}
