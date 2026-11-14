"use client";

import { useActionForm } from "@/hooks/use-action-form";
import {useState, useTransition} from "react";
import Link from "next/link";
import { Ban, Check, Eye, EyeOff, Loader2, LayoutDashboard, RotateCcw } from "lucide-react";
import type { SlugState } from "@/app/superadmin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  createdAt: string;
  isPublished: boolean;
  suspendedAt: string | null;
  suspendReason: string | null;
  members: number;
  transactions: number;
};

type Props = {
  row: Row;
  onPublish: (published: boolean) => Promise<void>;
  onSuspend: (reason: string) => Promise<void>;
  onUnsuspend: () => Promise<void>;
  onChangeSlug: (prev: SlugState, formData: FormData) => Promise<SlugState>;
};

export function SuperadminRow({ row, onPublish, onSuspend, onUnsuspend, onChangeSlug }: Props) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [slugState, slugAction, slugPending] = useActionForm(onChangeSlug, null);

  return (
    <li className="grid gap-2 py-3" data-testid={`tenant-${row.slug}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {row.name}{" "}
            {row.suspendedAt ? (
              <Badge variant="danger">Ditangguhkan</Badge>
            ) : row.isPublished ? (
              <Badge variant="success">Publik</Badge>
            ) : (
              <Badge variant="secondary">Tersembunyi</Badge>
            )}
          </p>
          <p className="text-muted-foreground text-sm">
            /{row.slug} · {row.city ?? "—"} · daftar {row.createdAt} · {row.members} pengurus · {row.transactions} transaksi
          </p>
          {row.suspendReason && <p className="text-xs text-red-700">Alasan: {row.suspendReason}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${row.slug}/admin`}>
              <LayoutDashboard /> Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            Ubah slug
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || Boolean(row.suspendedAt)}
            onClick={() => start(() => onPublish(!row.isPublished))}
          >
            {row.isPublished ? <EyeOff /> : <Eye />} {row.isPublished ? "Sembunyikan" : "Tampilkan"}
          </Button>
          {row.suspendedAt ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => onUnsuspend())}>
              <RotateCcw /> Pulihkan
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                const reason = prompt(`Alasan menangguhkan ${row.name}?`, "Pendaftaran tidak valid");
                if (reason !== null) start(() => onSuspend(reason));
              }}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Ban />} Tangguhkan
            </Button>
          )}
        </div>
      </div>
      {editing && (
        <form onSubmit={slugAction} className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">/</span>
          <Input name="slug" defaultValue={row.slug} className="h-8 w-56" aria-label={`Slug baru ${row.name}`} />
          <Button type="submit" size="sm" disabled={slugPending}>
            {slugPending ? <Loader2 className="animate-spin" /> : <Check />} Simpan
          </Button>
          <span className="text-muted-foreground text-xs">URL lama akan berhenti berfungsi.</span>
          {slugState?.error && <span className="text-destructive text-sm">{slugState.error}</span>}
        </form>
      )}
    </li>
  );
}
