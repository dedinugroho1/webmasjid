import { Megaphone, Pin } from "lucide-react";
import type { Announcement } from "@/db/schema";
import { formatDate } from "@/lib/format";

export function AnnouncementList({ items, timeZone }: { items: Announcement[]; timeZone: string }) {
  if (!items.length) return null;
  return (
    <ul className="grid gap-3">
      {items.map((a) => (
        <li
          key={a.id}
          className={`rounded-xl border p-4 ${a.isPinned ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : "bg-card"}`}
        >
          <p className="flex items-center gap-2 font-semibold">
            {a.isPinned ? <Pin className="size-4 text-amber-600" /> : <Megaphone className="text-primary size-4" />}
            {a.title}
          </p>
          <p className="mt-1 text-sm whitespace-pre-line">{a.body}</p>
          <p className="text-muted-foreground mt-2 text-xs">{formatDate(a.createdAt, timeZone, { weekday: "long" })}</p>
        </li>
      ))}
    </ul>
  );
}
