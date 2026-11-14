"use client";

import { useActionState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import type { JumatState } from "@/app/[slug]/admin/jumat/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = (prev: JumatState, formData: FormData) => Promise<JumatState>;

type Props = {
  label: string;
  isNext: boolean;
  initial: { khatib: string | null; imam: string | null; muadzin: string | null; theme: string | null } | null;
  action: Action;
};

export function JumatRow({ label, isNext, initial, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={`grid gap-2 rounded-lg border p-3 lg:grid-cols-[170px_1fr_1fr_1fr_1.3fr_auto] lg:items-center ${
        isNext ? "border-primary/40 bg-primary/5" : "bg-card"
      }`}
      aria-label={`Petugas Jumat ${label}`}
    >
      <div>
        <p className="font-semibold">{label}</p>
        {isNext && <p className="text-primary text-xs font-medium">Jumat terdekat</p>}
      </div>
      <LabeledInput name="khatib" label="Khatib" value={initial?.khatib} />
      <LabeledInput name="imam" label="Imam" value={initial?.imam} />
      <LabeledInput name="muadzin" label="Muadzin" placeholder="Muadzin / Bilal" value={initial?.muadzin} />
      <LabeledInput name="theme" label="Tema" placeholder="Tema khutbah (opsional)" value={initial?.theme} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant={state?.ok ? "outline" : "default"} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : state?.ok ? <Check /> : <Save />}
          {state?.ok ? "Tersimpan" : "Simpan"}
        </Button>
      </div>
      {state?.error && <p className="text-destructive text-sm lg:col-span-6">{state.error}</p>}
    </form>
  );
}

/** Label terlihat di HP; di desktop judul kolom ada di header tabel. */
function LabeledInput({ name, label, placeholder, value }: { name: string; label: string; placeholder?: string; value?: string | null }) {
  return (
    <label className="grid gap-1">
      <span className="text-muted-foreground text-xs lg:sr-only">{label}</span>
      <Input name={name} placeholder={placeholder ?? label} aria-label={label} defaultValue={value ?? ""} />
    </label>
  );
}
