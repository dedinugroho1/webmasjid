import { Clock, User } from "lucide-react";
import type { RoutineKajian } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { DAY_NAMES, FREQUENCY_LABELS, nextKajianDate } from "@/lib/jumat";

export function KajianList({ items, today }: { items: RoutineKajian[]; today: string }) {
  if (!items.length) return <p className="text-muted-foreground text-sm">Belum ada jadwal kajian rutin.</p>;
  return (
    <ul className="bg-card divide-y rounded-xl border">
      {items.map((k) => {
        const next = nextKajianDate(k, today);
        return (
          <li key={k.id} className="grid gap-1 p-4">
            <p className="text-primary text-sm font-semibold">
              {DAY_NAMES[k.dayOfWeek]}, {k.time}
              <span className="text-muted-foreground font-normal"> · {FREQUENCY_LABELS[k.frequency]}</span>
            </p>
            <p className="font-semibold">{k.title}</p>
            <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {k.ustadz && (
                <span className="flex items-center gap-1">
                  <User className="size-3.5" /> {k.ustadz}
                </span>
              )}
              {k.audience && <span>{k.audience}</span>}
              {k.location && <span>{k.location}</span>}
              {next && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {next === today ? "Hari ini" : `Berikutnya ${formatDate(next, "UTC", { weekday: "short", day: "numeric", month: "short" })}`}
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
