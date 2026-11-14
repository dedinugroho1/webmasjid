import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventForm } from "@/components/admin/event-form";
import { dateToLocalInput } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { updateEvent } from "../actions";

export default async function EditAgendaPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const [ev] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.tenantId, tenant.id)))
    .limit(1);
  if (!ev) notFound();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Edit Agenda</CardTitle>
      </CardHeader>
      <CardContent>
        <EventForm
          action={updateEvent.bind(null, slug, ev.id)}
          initial={{
            type: ev.type,
            title: ev.title,
            speaker: ev.speaker,
            imam: ev.imam,
            location: ev.location,
            description: ev.description,
            dateTime: dateToLocalInput(ev.dateTime, tenant.timezone),
          }}
          cancelHref={`/${slug}/admin/agenda`}
        />
      </CardContent>
    </Card>
  );
}
