"use client";

import { useActionForm } from "@/hooks/use-action-form";
import {useState} from "react";
import { Check, Copy, Link2, Loader2, MessageCircle } from "lucide-react";
import type { InviteState } from "@/app/[slug]/admin/pengurus/actions";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type Action = (prev: InviteState, formData: FormData) => Promise<InviteState>;

export function InviteForm({ action, masjidName }: { action: Action; masjidName: string }) {
  const [state, formAction, pending] = useActionForm(action, null);
  const [copied, setCopied] = useState(false);
  const waText = state?.url
    ? `Assalamu'alaikum, Anda diundang menjadi pengurus ${masjidName} di WebMasjid. Silakan buat akun melalui tautan ini (berlaku 7 hari): ${state.url}`
    : "";

  return (
    <div className="grid gap-4">
      <form onSubmit={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Peran" htmlFor="role">
          <NativeSelect id="role" name="role" defaultValue="BENDAHARA">
            <option value="BENDAHARA">Bendahara (hanya Buku Kas)</option>
            <option value="DKM_ADMIN">Admin DKM (semua menu)</option>
          </NativeSelect>
        </Field>
        <Field label="Catatan (opsional)" htmlFor="note">
          <Input id="note" name="note" placeholder="mis. Pak Ahmad — bendahara" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Buat Link
        </Button>
      </form>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.url && (
        <div className="border-primary/30 bg-primary/5 grid gap-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            Link undangan siap. Bagikan ke calon pengurus — link hanya ditampilkan sekali & berlaku 7 hari.
          </p>
          <code className="bg-background rounded border p-2 text-xs break-all">{state.url}</code>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(state.url!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check /> : <Copy />} Salin
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">
                <MessageCircle /> Kirim via WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
