"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/format";
import {
  ADJUSTABLE_PRAYERS,
  FARDH_PRAYERS,
  MAX_ADJUSTMENT,
  PRAYER_LABELS,
  getPrayerSchedule,
  type PrayerKey,
} from "@/lib/prayer";

type Props = {
  latitude: number;
  longitude: number;
  timezone: string;
  method: string;
  initialAdjustments: Partial<Record<PrayerKey, number>>;
  initialIqomah: Partial<Record<PrayerKey, number>>;
  defaultIqomah: number;
  errors?: Record<string, string[] | undefined>;
};

/** Tabel koreksi menit & jeda iqomah per waktu sholat, dengan pratinjau jadwal hari ini. */
export function PrayerTuning({ latitude, longitude, timezone, method, initialAdjustments, initialIqomah, defaultIqomah, errors }: Props) {
  const [adj, setAdj] = useState<Record<string, string>>(() =>
    Object.fromEntries(ADJUSTABLE_PRAYERS.map((k) => [k, String(initialAdjustments[k] ?? 0)])),
  );
  const [iqomah, setIqomah] = useState<Record<string, string>>(() =>
    Object.fromEntries(FARDH_PRAYERS.map((k) => [k, String(initialIqomah[k] ?? defaultIqomah)])),
  );

  const valid = Number.isFinite(latitude) && Number.isFinite(longitude);
  const preview = useMemo(() => {
    if (!valid) return null;
    const adjustments = Object.fromEntries(Object.entries(adj).map(([k, v]) => [k, Number(v) || 0]));
    return Object.fromEntries(
      getPrayerSchedule({ latitude, longitude, timezone, method, adjustments }).map((p) => [p.key, formatTime(p.time, timezone)]),
    );
  }, [adj, latitude, longitude, timezone, method, valid]);

  return (
    <div className="grid gap-2 sm:col-span-2">
      <p className="text-sm font-medium">Koreksi Jadwal & Jeda Iqomah</p>
      <p className="text-muted-foreground text-xs">
        Geser jadwal (±{MAX_ADJUSTMENT} menit) agar sama dengan jadwal masjid setempat, dan atur jeda iqomah tiap waktu.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Waktu</th>
              <th className="px-3 py-2 font-medium">Hari ini</th>
              <th className="px-3 py-2 font-medium">Koreksi (menit)</th>
              <th className="px-3 py-2 font-medium">Iqomah (menit)</th>
            </tr>
          </thead>
          <tbody>
            {ADJUSTABLE_PRAYERS.map((k) => {
              const fardh = FARDH_PRAYERS.includes(k);
              return (
                <tr key={k} className="border-t">
                  <td className="px-3 py-2 font-medium">{PRAYER_LABELS[k]}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{preview?.[k] ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      name={`adj_${k}`}
                      type="number"
                      min={-MAX_ADJUSTMENT}
                      max={MAX_ADJUSTMENT}
                      step={1}
                      value={adj[k]}
                      onChange={(e) => setAdj({ ...adj, [k]: e.target.value })}
                      className="h-8 w-24"
                      aria-label={`Koreksi ${PRAYER_LABELS[k]}`}
                      aria-invalid={Boolean(errors?.[`adj_${k}`])}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    {fardh ? (
                      <Input
                        name={`iqomah_${k}`}
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        value={iqomah[k]}
                        onChange={(e) => setIqomah({ ...iqomah, [k]: e.target.value })}
                        className="h-8 w-24"
                        aria-label={`Iqomah ${PRAYER_LABELS[k]}`}
                        aria-invalid={Boolean(errors?.[`iqomah_${k}`])}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errors &&
        Object.entries(errors)
          .filter(([k]) => k.startsWith("adj_") || k.startsWith("iqomah_"))
          .map(([k, v]) => (
            <p key={k} className="text-destructive text-xs">
              {PRAYER_LABELS[k.split("_")[1] as PrayerKey]}: {v?.[0]}
            </p>
          ))}
    </div>
  );
}
