import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";
import { db } from "@/db";
import { routineKajian } from "@/db/schema";
import { DeleteButton } from "@/components/admin/delete-button";
import { KajianForm } from "@/components/admin/kajian-form";
import { ToggleButton } from "@/components/admin/toggle-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DAY_NAMES, FREQUENCY_LABELS } from "@/lib/jumat";
import { requireTenantAccess } from "@/lib/session";
import { createKajian, deleteKajian, toggleKajian } from "./actions";

export default async function KajianPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const list = await db
    .select()
    .from(routineKajian)
    .where(eq(routineKajian.tenantId, tenant.id))
    .orderBy(asc(routineKajian.dayOfWeek), asc(routineKajian.createdAt));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Kajian Rutin</h1>
        <p className="text-muted-foreground text-sm">
          Pengajian yang berulang setiap pekan/bulan. Cukup diisi sekali — tampil otomatis di website.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tambah Kajian Rutin</CardTitle>
          </CardHeader>
          <CardContent>
            <KajianForm action={createKajian.bind(null, slug)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Jadwal Kajian</CardTitle>
            <CardDescription>{list.length} kajian</CardDescription>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada kajian rutin.</p>
            ) : (
              <ul className="divide-y">
                {list.map((k) => (
                  <li key={k.id} className={`flex flex-wrap items-start justify-between gap-3 py-3 ${k.isActive ? "" : "opacity-60"}`}>
                    <div className="min-w-0">
                      <p className="text-primary text-sm font-semibold">
                        {DAY_NAMES[k.dayOfWeek]}, {k.time} {!k.isActive && <Badge variant="secondary">Libur</Badge>}
                      </p>
                      <p className="font-medium">{k.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {[k.ustadz, FREQUENCY_LABELS[k.frequency], k.audience, k.location].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <ToggleButton label={k.isActive ? "Liburkan" : "Aktifkan"} action={toggleKajian.bind(null, slug, k.id)} />
                      <Button asChild variant="ghost" size="icon" aria-label="Edit">
                        <Link href={`/${slug}/admin/kajian/${k.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <DeleteButton action={deleteKajian.bind(null, slug, k.id)} confirmText="Hapus kajian rutin ini?" />
                    </div>
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
