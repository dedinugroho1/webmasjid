import { Mic } from "lucide-react";
import type { JumatSchedule } from "@/db/schema";
import { formatDate } from "@/lib/format";

/** Petugas Jumat terdekat + beberapa Jumat berikutnya. */
export function JumatCard({ fridays, schedules }: { fridays: string[]; schedules: JumatSchedule[] }) {
  const byDate = new Map(schedules.map((s) => [s.date, s]));
  const [next, ...rest] = fridays;
  const j = byDate.get(next);
  return (
    <div className="bg-card grid gap-4 rounded-xl border p-5">
      <div>
        <p className="text-muted-foreground text-xs font-medium uppercase">Jumat terdekat</p>
        <p className="text-lg font-bold">{formatDate(next, "UTC", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      {j ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Khatib</dt>
          <dd className="font-semibold">{j.khatib ?? "—"}</dd>
          <dt className="text-muted-foreground">Imam</dt>
          <dd className="font-semibold">{j.imam ?? "—"}</dd>
          <dt className="text-muted-foreground">Muadzin</dt>
          <dd className="font-semibold">{j.muadzin ?? "—"}</dd>
          {j.theme && (
            <>
              <dt className="text-muted-foreground">Tema</dt>
              <dd>{j.theme}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-muted-foreground text-sm">Petugas belum diumumkan.</p>
      )}
      {rest.some((d) => byDate.get(d)?.khatib) && (
        <ul className="divide-y border-t text-sm">
          {rest.map((d) => {
            const s = byDate.get(d);
            if (!s?.khatib) return null;
            return (
              <li key={d} className="flex items-center justify-between gap-3 py-2">
                <span className="text-muted-foreground">{formatDate(d, "UTC", { day: "numeric", month: "short" })}</span>
                <span className="flex items-center gap-1.5 text-right">
                  <Mic className="text-primary size-3.5" /> {s.khatib}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
