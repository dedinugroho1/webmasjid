import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/admin/delete-button";
import { EventForm } from "@/components/admin/event-form";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { createEvent, deleteEvent } from "./actions";

export default async function AgendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const list = await db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenant.id))
    .orderBy(desc(events.dateTime))
    .limit(100);
  const now = Date.now();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Agenda & Kajian</h1>
        <p className="text-muted-foreground text-sm">Jadwal kajian, petugas sholat Jumat, dan kegiatan sosial.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tambah Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <EventForm action={createEvent.bind(null, slug)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Semua Agenda</CardTitle>
            <CardDescription>Waktu ditampilkan dalam zona {tenant.timezone}.</CardDescription>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada agenda.</p>
            ) : (
              <ul className="divide-y">
                {list.map((e) => (
                  <li key={e.id} className={`flex items-start justify-between gap-3 py-3 ${e.dateTime.getTime() < now ? "opacity-60" : ""}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={e.type === "JUMAT" ? "default" : "secondary"}>{EVENT_TYPE_LABELS[e.type]}</Badge>
                        <span className="text-muted-foreground text-xs">{formatDateTime(e.dateTime, tenant.timezone)}</span>
                      </div>
                      <p className="mt-1 font-medium">{e.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {[e.speaker && `${e.type === "JUMAT" ? "Khatib" : "Pemateri"}: ${e.speaker}`, e.imam && `Imam: ${e.imam}`, e.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <DeleteButton action={deleteEvent.bind(null, slug, e.id)} confirmText="Hapus agenda ini?" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
