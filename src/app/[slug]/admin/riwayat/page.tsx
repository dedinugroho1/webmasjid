import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationLinks } from "@/components/ui/pagination-links";
import type { AuditAction, AuditEntity } from "@/db/schema";
import { listAudit } from "@/lib/audit-log";
import { formatDateTime } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ jenis?: string; hal?: string }> };

const ACTION_BADGE: Record<AuditAction, { label: string; variant: "success" | "secondary" | "danger" | "default" | "outline" }> = {
  CREATE: { label: "Tambah", variant: "success" },
  UPDATE: { label: "Ubah", variant: "default" },
  DELETE: { label: "Hapus", variant: "danger" },
  INVITE: { label: "Undangan", variant: "secondary" },
  ROLE: { label: "Peran", variant: "secondary" },
  REMOVE: { label: "Keluar", variant: "danger" },
  PASSWORD_RESET: { label: "Password", variant: "outline" },
};

/**
 * Riwayat perubahan: siapa menambah/mengubah/menghapus transaksi kas dan
 * mengelola pengurus. Bendahara hanya melihat riwayat kas.
 */
export default async function RiwayatPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { tenant, user } = await requireTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);

  const canSeeMembers = user.role !== "BENDAHARA";
  const jenis = canSeeMembers && (sp.jenis === "kas" || sp.jenis === "pengurus") ? sp.jenis : "semua";
  const entities: AuditEntity[] =
    jenis === "kas" || !canSeeMembers ? ["cash_transaction"] : jenis === "pengurus" ? ["member"] : ["cash_transaction", "member"];
  const page = Math.max(1, Number(sp.hal) || 1);
  const { rows, total, pages } = await listAudit(tenant.id, { entities, page });

  const href = (j: string, p = 1) => `/${slug}/admin/riwayat?jenis=${j}&hal=${p}`;
  const tabs = canSeeMembers
    ? [
        ["semua", "Semua"],
        ["kas", "Buku Kas"],
        ["pengurus", "Pengurus"],
      ]
    : [["kas", "Buku Kas"]];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Perubahan</h1>
        <p className="text-muted-foreground text-sm">
          Jejak siapa menambah, mengubah, atau menghapus transaksi kas
          {canSeeMembers ? " dan mengelola pengurus" : ""}. Riwayat tidak dapat diubah atau dihapus dari aplikasi.
        </p>
      </div>
      <div className="flex gap-2">
        {tabs.map(([key, label]) => (
          <Button key={key} asChild size="sm" variant={(!canSeeMembers ? "kas" : jenis) === key ? "default" : "outline"}>
            <Link href={href(key)}>{label}</Link>
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
          <CardDescription>Waktu dalam zona {tenant.timezone}.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada aktivitas tercatat.</p>
          ) : (
            <ul className="divide-y" data-testid="audit-list">
              {rows.map((r) => (
                <li key={r.id} className="grid gap-1 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ACTION_BADGE[r.action].variant}>{ACTION_BADGE[r.action].label}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(r.createdAt, tenant.timezone)} · oleh <b className="text-foreground">{r.actorName}</b>
                    </span>
                  </div>
                  <p className="text-sm">{r.summary}</p>
                </li>
              ))}
            </ul>
          )}
          <PaginationLinks page={page} pages={pages} total={total} noun="aktivitas" hrefFor={(p) => href(jenis, p)} />
        </CardContent>
      </Card>
    </div>
  );
}
