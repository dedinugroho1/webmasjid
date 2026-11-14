import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateToLocalInput } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { updateAnnouncement } from "../actions";

export default async function EditPengumumanPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const [a] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.tenantId, tenant.id)))
    .limit(1);
  if (!a) notFound();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Edit Pengumuman</CardTitle>
      </CardHeader>
      <CardContent>
        <AnnouncementForm
          action={updateAnnouncement.bind(null, slug, a.id)}
          initial={{
            title: a.title,
            body: a.body,
            isPinned: a.isPinned,
            expiresAt: a.expiresAt ? dateToLocalInput(a.expiresAt, tenant.timezone) : null,
          }}
          cancelHref={`/${slug}/admin/pengumuman`}
        />
      </CardContent>
    </Card>
  );
}
