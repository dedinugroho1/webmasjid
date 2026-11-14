"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatDate, formatHijri, formatTime } from "@/lib/format";
import { formatCountdown, getCurrentPrayer, getNextPrayer, getPrayerSchedule, iqomahFor, isFriday } from "@/lib/prayer";
import type { PrayerClientConfig } from "@/lib/tenant";
import { cn } from "@/lib/utils";

export function PrayerWidget({ config }: { config: PrayerClientConfig }) {
  const now = useNow(1000);
  const dayKey = now ? formatDate(now, config.timezone) : "";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schedule = useMemo(() => (now ? getPrayerSchedule(config, now) : []), [dayKey, config]);

  if (!now) {
    return <div className="bg-muted h-64 animate-pulse rounded-xl" aria-label="Memuat jadwal sholat" />;
  }

  const next = getNextPrayer(config, now);
  const current = getCurrentPrayer(config, now);
  // Jumat siang: khutbah, tanpa hitung mundur iqomah.
  const jumat = current?.key === "dzuhur" && isFriday(now, config.timezone);
  const iqomahAt = current && !jumat ? current.time.getTime() + iqomahFor(config, current.key) * 60_000 : 0;
  const inIqomah = current && now.getTime() < iqomahAt;

  return (
    <div className="overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-700 to-teal-800 text-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-emerald-100">
            {formatDate(now, config.timezone, { weekday: "long" })} · {formatHijri(now, config.timezone)}
          </p>
          <p className="font-mono text-4xl font-bold tabular-nums">{formatTime(now, config.timezone)}</p>
        </div>
        <div className="text-right">
          {inIqomah ? (
            <>
              <p className="text-sm text-emerald-100">Iqomah {current.label} dalam</p>
              <p className="font-mono text-3xl font-bold text-amber-300 tabular-nums">
                {formatCountdown(iqomahAt - now.getTime())}
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center justify-end gap-1 text-sm text-emerald-100">
                <Clock className="size-4" /> Menuju adzan {next.label}
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums">
                {formatCountdown(next.time.getTime() - now.getTime())}
              </p>
            </>
          )}
        </div>
      </div>
      <ul className="grid grid-cols-4 gap-px bg-white/10 sm:grid-cols-7">
        {schedule.map((p) => {
          const active = p.key === next.key && p.time.getTime() === next.time.getTime();
          return (
            <li
              key={p.key}
              className={cn("bg-teal-900/60 px-2 py-3 text-center", active && "bg-amber-400 text-teal-950")}
            >
              <p className={cn("text-xs", active ? "font-semibold" : "text-emerald-100")}>{p.label}</p>
              <p className="font-mono text-lg font-semibold tabular-nums">{formatTime(p.time, config.timezone)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
