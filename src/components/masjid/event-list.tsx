import { CalendarDays, MapPin, Mic, User } from "lucide-react";
import type { MasjidEvent } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export function EventList({ events, timeZone }: { events: MasjidEvent[]; timeZone: string }) {
  if (!events.length) return <p className="text-muted-foreground text-sm">Belum ada agenda terdekat.</p>;
  return (
    <ul className="grid gap-3">
      {events.map((e) => (
        <li key={e.id} className="bg-card rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={e.type === "JUMAT" ? "default" : e.type === "SOSIAL" ? "secondary" : "success"}>
              {EVENT_TYPE_LABELS[e.type]}
            </Badge>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3.5" /> {formatDateTime(e.dateTime, timeZone)}
            </span>
          </div>
          <p className="mt-2 font-semibold">{e.title}</p>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {e.speaker && (
              <span className="flex items-center gap-1">
                <Mic className="size-3.5" /> {e.type === "JUMAT" ? "Khatib" : "Pemateri"}: {e.speaker}
              </span>
            )}
            {e.imam && (
              <span className="flex items-center gap-1">
                <User className="size-3.5" /> Imam: {e.imam}
              </span>
            )}
            {e.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {e.location}
              </span>
            )}
          </div>
          {e.description && <p className="mt-2 text-sm">{e.description}</p>}
        </li>
      ))}
    </ul>
  );
}
