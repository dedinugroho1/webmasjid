"use client";

import { useState, useTransition } from "react";
import { Ban, CircleCheck, Loader2 } from "lucide-react";
import type { BulkResult, DeleteTenantResult, SlugState } from "@/app/superadmin/actions";
import { SuperadminRow } from "@/components/admin/superadmin-row";
import { Button } from "@/components/ui/button";

type Row = React.ComponentProps<typeof SuperadminRow>["row"];

type Actions = {
  setPublished: (id: string, published: boolean) => Promise<void>;
  approveTenant: (id: string) => Promise<void>;
  rejectTenant: (id: string, reason: string) => Promise<void>;
  suspendTenant: (id: string, reason: string) => Promise<void>;
  unsuspendTenant: (id: string) => Promise<void>;
  changeSlug: (id: string, prev: SlugState, formData: FormData) => Promise<SlugState>;
  deleteTenant: (id: string, confirm: string) => Promise<DeleteTenantResult>;
  approveTenants: (ids: string[]) => Promise<BulkResult>;
  rejectTenants: (ids: string[], reason: string) => Promise<BulkResult>;
};

/** Daftar masjid di panel superadmin, dengan pilihan massal untuk antrean persetujuan. */
export function TenantList({ rows, actions }: { rows: Row[]; actions: Actions }) {
  const awaitingIds = rows.filter((r) => !r.approvedAt && !r.suspendedAt && !r.isDemo).map((r) => r.id);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Abaikan pilihan yang sudah tidak menunggu (mis. setelah disetujui).
  const selected = awaitingIds.filter((id) => picked.has(id));
  const allPicked = awaitingIds.length > 0 && selected.length === awaitingIds.length;

  const toggle = (id: string, checked: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const runBulk = (run: () => Promise<BulkResult>, verb: string) =>
    start(async () => {
      const res = await run();
      setMessage(res.ok ? `${res.count} masjid ${verb}.` : res.error);
      if (res.ok) setPicked(new Set());
    });

  return (
    <>
      {awaitingIds.length > 0 && (
        <div
          className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-sky-300 bg-sky-50 p-2 text-sm"
          data-testid="bulk-bar"
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={allPicked}
              onChange={(e) => setPicked(e.target.checked ? new Set(awaitingIds) : new Set())}
              aria-label="Pilih semua yang menunggu"
            />
            Pilih semua yang menunggu ({awaitingIds.length})
          </label>
          <Button
            size="sm"
            disabled={pending || selected.length === 0}
            onClick={() => runBulk(() => actions.approveTenants(selected), "disetujui")}
          >
            {pending ? <Loader2 className="animate-spin" /> : <CircleCheck />} Setujui terpilih ({selected.length})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || selected.length === 0}
            onClick={() => {
              const reason = prompt(`Alasan menolak ${selected.length} pendaftaran?`, "Pendaftaran tidak valid");
              if (reason !== null) runBulk(() => actions.rejectTenants(selected, reason), "ditolak");
            }}
          >
            <Ban /> Tolak terpilih ({selected.length})
          </Button>
          {message && (
            <span role="status" className="text-muted-foreground">
              {message}
            </span>
          )}
        </div>
      )}
      <ul className="divide-y">
        {rows.map((r) => (
          <SuperadminRow
            key={r.id}
            row={r}
            onPublish={(v) => actions.setPublished(r.id, v)}
            onApprove={() => actions.approveTenant(r.id)}
            onReject={(reason) => actions.rejectTenant(r.id, reason)}
            onSuspend={(reason) => actions.suspendTenant(r.id, reason)}
            onUnsuspend={() => actions.unsuspendTenant(r.id)}
            onChangeSlug={(prev, fd) => actions.changeSlug(r.id, prev, fd)}
            onDelete={(confirm) => actions.deleteTenant(r.id, confirm)}
            selected={picked.has(r.id)}
            onSelect={(checked) => toggle(r.id, checked)}
          />
        ))}
      </ul>
    </>
  );
}
