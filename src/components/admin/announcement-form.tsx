"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Plus, Save } from "lucide-react";
import type { AnnouncementState } from "@/app/[slug]/admin/pengumuman/actions";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Action = (prev: AnnouncementState, formData: FormData) => Promise<AnnouncementState>;

export type AnnouncementInitial = { title: string; body: string; isPinned: boolean; expiresAt: string | null };

export function AnnouncementForm({ action, initial, cancelHref }: { action: Action; initial?: AnnouncementInitial; cancelHref?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !initial) ref.current?.reset();
  }, [state, initial]);
  const fe = state?.fieldErrors;

  return (
    <form ref={ref} action={formAction} className="grid gap-4">
      <Field label="Judul" htmlFor="title" error={fe?.title}>
        <Input id="title" name="title" placeholder="mis. Pembagian Daging Qurban" defaultValue={initial?.title} required />
      </Field>
      <Field label="Isi Pengumuman" htmlFor="body" error={fe?.body}>
        <Textarea id="body" name="body" rows={5} defaultValue={initial?.body} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <Field label="Tampil hingga (opsional)" htmlFor="expiresAt" error={fe?.expiresAt}>
          <Input id="expiresAt" name="expiresAt" type="datetime-local" defaultValue={initial?.expiresAt ?? ""} />
        </Field>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="isPinned" defaultChecked={initial?.isPinned} className="accent-primary size-4" />
          Sematkan di paling atas
        </label>
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Pengumuman diterbitkan.</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Loader2 className="animate-spin" /> : initial ? <Save /> : <Plus />}{" "}
          {initial ? "Simpan Perubahan" : "Terbitkan"}
        </Button>
        {cancelHref && (
          <Button asChild variant="outline">
            <Link href={cancelHref}>Batal</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
