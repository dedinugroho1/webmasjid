import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PinButton } from "@/components/admin/pin-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { createAnnouncement, deleteAnnouncement, togglePin } from "./actions";

export default async function PengumumanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const list = await db
    .select()
    .from(announcements)
    .where(eq(announcements.tenantId, tenant.id))
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
    .limit(100);
  const now = Date.now();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Pengumuman</h1>
        <p className="text-muted-foreground text-sm">Informasi untuk jamaah, tampil di bagian atas website masjid.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Buat Pengumuman</CardTitle>
          </CardHeader>
          <CardContent>
            <AnnouncementForm action={createAnnouncement.bind(null, slug)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Semua Pengumuman</CardTitle>
            <CardDescription>Pengumuman kedaluwarsa tidak tampil di website.</CardDescription>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada pengumuman.</p>
            ) : (
              <ul className="divide-y">
                {list.map((a) => {
                  const expired = a.expiresAt && a.expiresAt.getTime() < now;
                  return (
                    <li key={a.id} className={`flex items-start justify-between gap-3 py-3 ${expired ? "opacity-60" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {a.title} {a.isPinned && <Badge>Disematkan</Badge>} {expired && <Badge variant="secondary">Kedaluwarsa</Badge>}
                        </p>
                        <p className="text-muted-foreground line-clamp-2 text-sm whitespace-pre-line">{a.body}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDateTime(a.createdAt, tenant.timezone)}
                          {a.expiresAt && ` · tampil hingga ${formatDateTime(a.expiresAt, tenant.timezone)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0">
                        <PinButton pinned={a.isPinned} action={togglePin.bind(null, slug, a.id)} />
                        <Button asChild variant="ghost" size="icon" aria-label="Edit">
                          <Link href={`/${slug}/admin/pengumuman/${a.id}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <DeleteButton action={deleteAnnouncement.bind(null, slug, a.id)} confirmText="Hapus pengumuman ini?" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
