import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { formatDateTime } from "@/lib/format";
import { listPlatformAudit } from "@/lib/platform-audit";
import {
  PLATFORM_ACTION_LABELS,
  PLATFORM_GROUP_LABELS,
  actionGroup,
  parsePlatformGroup,
} from "@/lib/platform-audit-core";

export const metadata: Metadata = { title: "Riwayat · Superadmin", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string; jenis?: string; hal?: string }> };

const DANGER = new Set(["TENANT_DELETE", "TENANT_REJECT", "TENANT_SUSPEND", "USER_DELETE"]);

export default async function RiwayatPlatformPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const group = parsePlatformGroup(sp.jenis);
  const list = await listPlatformAudit({ q, group, page: Math.max(1, Number(sp.hal) || 1) });
  const href = (p: number) =>
    `/superadmin/riwayat?${new URLSearchParams({ ...(q ? { q } : {}), ...(group ? { jenis: group } : {}), hal: String(p) })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Tindakan</CardTitle>
        <CardDescription>
          Jejak setiap tindakan pengelola platform: persetujuan, penangguhan, penghapusan masjid, perubahan akun, dan
          pengaturan. Catatan tetap ada walau masjid atau akunnya sudah dihapus; email ditampilkan tersamar.
        </CardDescription>
        <form className="mt-2 flex flex-wrap items-center gap-2" method="GET">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari masjid, pengguna, atau pelaku…"
            className="max-w-xs"
            aria-label="Cari riwayat"
          />
          <NativeSelect name="jenis" defaultValue={group ?? ""} className="w-auto" aria-label="Jenis tindakan">
            <option value="">Semua jenis</option>
            {Object.entries(PLATFORM_GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outline">
            <Search /> Cari
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {list.rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada tindakan yang tercatat.</p>
        ) : (
          <ol className="divide-y" data-testid="platform-audit-list">
            {list.rows.map((r) => (
              <li key={r.id} className="grid gap-1 py-3" data-testid="platform-audit-entry">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={DANGER.has(r.action) ? "danger" : "secondary"}>{PLATFORM_ACTION_LABELS[r.action]}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {PLATFORM_GROUP_LABELS[actionGroup(r.action)]} · {formatDateTime(r.createdAt)}
                  </span>
                </div>
                <p className="text-sm">{r.summary}</p>
                <p className="text-muted-foreground text-xs">
                  oleh {r.actorName}
                  {r.actorEmail ? ` (${r.actorEmail})` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
        <PaginationLinks page={list.page} pages={list.pages} total={list.total} noun="catatan" hrefFor={href} />
      </CardContent>
    </Card>
  );
}
