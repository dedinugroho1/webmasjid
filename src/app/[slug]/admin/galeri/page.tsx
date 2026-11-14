import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { galleryItems } from "@/db/schema";
import { DeleteButton } from "@/components/admin/delete-button";
import { GalleryForm } from "@/components/admin/gallery-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, todayISO } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { addGalleryItem, deleteGalleryItem } from "./actions";

export default async function GaleriPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const items = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.tenantId, tenant.id))
    .orderBy(desc(galleryItems.createdAt))
    .limit(120);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Galeri Kegiatan</h1>
        <p className="text-muted-foreground text-sm">Dokumentasi kegiatan masjid untuk jamaah & donatur.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Tambah Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <GalleryForm action={addGalleryItem.bind(null, slug)} today={todayISO(tenant.timezone)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Foto</CardTitle>
            <CardDescription>{items.length} foto</CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada foto.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((g) => (
                  <li key={g.id} className="group relative overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.imageUrl} alt={g.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-start justify-between gap-2 p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{g.caption ?? "Tanpa keterangan"}</p>
                        {g.takenAt && <p className="text-muted-foreground text-xs">{formatDate(g.takenAt)}</p>}
                      </div>
                      <DeleteButton action={deleteGalleryItem.bind(null, slug, g.id)} confirmText="Hapus foto ini?" />
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
