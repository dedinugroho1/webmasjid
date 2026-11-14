"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Maximize } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatDate, formatHijri } from "@/lib/format";
import {
  FARDH_PRAYERS,
  formatCountdown,
  getCurrentPrayer,
  getNextPrayer,
  getPrayerSchedule,
  isFriday,
} from "@/lib/prayer";
import type { PrayerClientConfig } from "@/lib/tenant";
import { cn } from "@/lib/utils";

/** Durasi fase layar (menit). */
const ADZAN_MINUTES = 4;
const SHOLAT_MINUTES = 12;
const JUMAT_KHUTBAH_MINUTES = 45;
/** Interval memuat ulang data server (running text/pengaturan) di TV. */
const REFRESH_MS = 10 * 60_000;

type Phase =
  | { kind: "NORMAL" }
  | { kind: "ADZAN"; label: string }
  | { kind: "IQOMAH"; label: string; until: number }
  | { kind: "KHUTBAH" }
  | { kind: "SHOLAT"; label: string };

type Props = {
  name: string;
  address: string | null;
  logoUrl: string | null;
  runningText: string;
  config: PrayerClientConfig;
};

function clock(d: Date, timeZone: string, seconds = true) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: seconds ? "2-digit" : undefined,
    hour12: false,
    timeZone,
  })
    .format(d)
    .replaceAll(".", ":");
}

function resolvePhase(config: PrayerClientConfig, now: Date): Phase {
  const current = getCurrentPrayer(config, now);
  if (!current) return { kind: "NORMAL" };
  const start = current.time.getTime();
  const t = now.getTime();
  const min = 60_000;

  const friday = current.key === "dzuhur" && isFriday(now, config.timezone);
  if (friday) {
    if (t < start + ADZAN_MINUTES * min) return { kind: "ADZAN", label: "Jumat" };
    if (t < start + (JUMAT_KHUTBAH_MINUTES + SHOLAT_MINUTES) * min) return { kind: "KHUTBAH" };
    return { kind: "NORMAL" };
  }

  const adzanEnd = start + ADZAN_MINUTES * min;
  const iqomahEnd = Math.max(adzanEnd, start + config.iqomahOffsetMinutes * min);
  if (t < adzanEnd) return { kind: "ADZAN", label: current.label };
  if (t < iqomahEnd) return { kind: "IQOMAH", label: current.label, until: iqomahEnd };
  if (t < iqomahEnd + SHOLAT_MINUTES * min) return { kind: "SHOLAT", label: current.label };
  return { kind: "NORMAL" };
}

export function TvDisplay({ name, address, logoUrl, runningText, config }: Props) {
  const router = useRouter();
  const now = useNow(1000);
  const dayKey = now ? formatDate(now, config.timezone) : "";

  // Refresh data dari server berkala (mis. running text diubah admin).
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // Cegah layar TV/tablet tertidur (bila browser mendukung).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schedule = useMemo(() => (now ? getPrayerSchedule(config, now) : []), [dayKey, config]);
  const messages = useMemo(
    () => runningText.split(/\n|\|/).map((s) => s.trim()).filter(Boolean),
    [runningText],
  );

  if (!now) return <div className="h-dvh w-dvw bg-black" />;

  const phase = resolvePhase(config, now);
  const next = getNextPrayer(config, now);
  const cards = schedule.filter((p) => p.key !== "imsak");

  return (
    <div className="relative flex h-dvh w-dvw flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 text-white select-none">
      {/* Header */}
      <header className="flex items-center justify-between gap-[2vw] px-[3vw] pt-[2.5vh]">
        <div className="flex min-w-0 items-center gap-[1.5vw]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-[8vh] w-[8vh] rounded-xl bg-white object-contain p-1" />
          ) : (
            <Landmark className="h-[7vh] w-[7vh] text-amber-300" />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[min(4.2vh,3vw)] font-bold">{name}</h1>
            {address && <p className="truncate text-[min(2.2vh,1.6vw)] text-teal-200/80">{address}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[min(3vh,2.2vw)] font-semibold">
            {formatDate(now, config.timezone, { weekday: "long" })}
          </p>
          <p className="text-[min(2.6vh,1.9vw)] text-amber-300">{formatHijri(now, config.timezone)}</p>
        </div>
      </header>

      {/* Jam & hitung mundur */}
      <main className="flex flex-1 flex-col items-center justify-center">
        <p className="font-mono text-[min(22vh,16vw)] leading-none font-bold tabular-nums drop-shadow-lg">
          {clock(now, config.timezone)}
        </p>
        <p className="mt-[2vh] text-[min(4vh,3vw)] text-teal-100">
          Menuju adzan <span className="font-bold text-amber-300">{next.label}</span>{" "}
          <span className="font-mono tabular-nums">−{formatCountdown(next.time.getTime() - now.getTime())}</span>
        </p>
      </main>

      {/* Kartu waktu sholat */}
      <section className="grid grid-cols-6 gap-[1vw] px-[3vw] pb-[2vh]">
        {cards.map((p) => {
          const isNext = p.key === next.key && p.time.getTime() === next.time.getTime();
          return (
            <div
              key={p.key}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/5 py-[2vh] text-center backdrop-blur",
                isNext && "border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.4)]",
                !FARDH_PRAYERS.includes(p.key) && !isNext && "opacity-70",
              )}
            >
              <p className="text-[min(3vh,2.2vw)] font-semibold">{p.label}</p>
              <p className="font-mono text-[min(6vh,4.4vw)] leading-tight font-bold tabular-nums">
                {clock(p.time, config.timezone, false)}
              </p>
            </div>
          );
        })}
      </section>

      {/* Running text */}
      <footer className="overflow-hidden border-t border-white/10 bg-amber-400 py-[1.2vh] text-slate-950">
        <div
          className="animate-marquee flex w-max text-[min(3.4vh,2.4vw)] font-semibold whitespace-nowrap"
          style={{ ["--marquee-duration" as string]: `${Math.max(20, messages.join(" ").length * 0.35)}s` }}
        >
          {[0, 1].map((dup) => (
            <span key={dup} aria-hidden={dup === 1} className="flex">
              {messages.map((m, i) => (
                <span key={i} className="px-[3vw]">
                  ✦ {m}
                </span>
              ))}
            </span>
          ))}
        </div>
      </footer>

      <PhaseOverlay phase={phase} now={now} />

      <button
        type="button"
        onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
        className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-white/10 p-2 opacity-0 transition hover:opacity-100 focus:opacity-100"
        aria-label="Layar penuh"
      >
        <Maximize className="size-5" />
      </button>
    </div>
  );
}

function PhaseOverlay({ phase, now }: { phase: Phase; now: Date }) {
  if (phase.kind === "NORMAL") return null;
  const base = "absolute inset-0 z-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700";

  if (phase.kind === "ADZAN") {
    return (
      <div className={cn(base, "bg-teal-950/95")}>
        <p className="text-[min(5vh,3.5vw)] tracking-[0.3em] text-teal-200 uppercase">Telah masuk waktu</p>
        <p className="text-[min(18vh,13vw)] leading-none font-bold text-amber-300">{phase.label}</p>
        <p className="mt-[3vh] text-[min(4vh,3vw)] text-teal-100">Mari dengarkan & jawab adzan</p>
      </div>
    );
  }
  if (phase.kind === "IQOMAH") {
    return (
      <div className={cn(base, "bg-slate-950/95")}>
        <p className="text-[min(5vh,3.5vw)] tracking-[0.3em] text-teal-200 uppercase">Iqomah {phase.label}</p>
        <p className="font-mono text-[min(26vh,19vw)] leading-none font-bold text-white tabular-nums">
          {formatCountdown(phase.until - now.getTime())}
        </p>
        <p className="mt-[3vh] text-[min(4vh,3vw)] text-amber-300">Luruskan & rapatkan shaf · Matikan handphone</p>
      </div>
    );
  }
  if (phase.kind === "KHUTBAH") {
    return (
      <div className={cn(base, "bg-black")}>
        <p className="text-[min(9vh,6.5vw)] font-bold text-amber-300">Khutbah Jumat</p>
        <p className="mt-[3vh] max-w-[70vw] text-[min(4vh,3vw)] text-white/70">
          &ldquo;Apabila engkau berkata kepada temanmu &lsquo;diamlah&rsquo; pada hari Jumat ketika imam berkhutbah, maka
          sungguh engkau telah berbuat sia-sia.&rdquo; (HR. Bukhari & Muslim)
        </p>
      </div>
    );
  }
  return (
    <div className={cn(base, "bg-black")}>
      <p className="text-[min(7vh,5vw)] font-bold text-white/80">Sholat {phase.label} sedang berlangsung</p>
      <p className="mt-[2vh] text-[min(3.5vh,2.5vw)] text-white/50">Harap tenang & non-aktifkan handphone</p>
    </div>
  );
}
