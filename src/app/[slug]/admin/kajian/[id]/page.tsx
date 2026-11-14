import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { routineKajian } from "@/db/schema";
import { KajianForm } from "@/components/admin/kajian-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenantAccess } from "@/lib/session";
import { updateKajian } from "../actions";

export default async function EditKajianPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const [k] = await db
    .select()
    .from(routineKajian)
    .where(and(eq(routineKajian.id, id), eq(routineKajian.tenantId, tenant.id)))
    .limit(1);
  if (!k) notFound();
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Edit Kajian Rutin</CardTitle>
      </CardHeader>
      <CardContent>
        <KajianForm
          action={updateKajian.bind(null, slug, k.id)}
          initial={{
            dayOfWeek: k.dayOfWeek,
            time: k.time,
            title: k.title,
            ustadz: k.ustadz,
            frequency: k.frequency,
            audience: k.audience,
            location: k.location,
          }}
          cancelHref={`/${slug}/admin/kajian`}
        />
      </CardContent>
    </Card>
  );
}
