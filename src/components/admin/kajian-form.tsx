"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Plus, Save } from "lucide-react";
import type { KajianState } from "@/app/[slug]/admin/kajian/actions";
import type { KajianFrequency } from "@/db/schema";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DAY_NAMES, FREQUENCY_LABELS } from "@/lib/jumat";

type Action = (prev: KajianState, formData: FormData) => Promise<KajianState>;

export type KajianInitial = {
  dayOfWeek: number;
  time: string;
  title: string;
  ustadz: string | null;
  frequency: KajianFrequency;
  audience: string | null;
  location: string | null;
};

const TIME_SUGGESTIONS = ["Ba'da Subuh", "Ba'da Dzuhur", "Ba'da Ashar", "Ba'da Maghrib", "Ba'da Isya"];

export function KajianForm({ action, initial, cancelHref }: { action: Action; initial?: KajianInitial; cancelHref?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !initial) ref.current?.reset();
  }, [state, initial]);
  const fe = state?.fieldErrors;

  return (
    <form ref={ref} action={formAction} className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hari" htmlFor="dayOfWeek" error={fe?.dayOfWeek}>
          <NativeSelect id="dayOfWeek" name="dayOfWeek" defaultValue={String(initial?.dayOfWeek ?? 0)}>
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Waktu" htmlFor="time" error={fe?.time}>
          <Input id="time" name="time" list="kajian-times" placeholder="Ba'da Maghrib" defaultValue={initial?.time} required />
          <datalist id="kajian-times">
            {TIME_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Judul / Kitab" htmlFor="title" error={fe?.title}>
        <Input id="title" name="title" placeholder="Tafsir Juz 'Amma, Riyadhus Shalihin, Tahsin…" defaultValue={initial?.title} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ustadz / Pengisi" htmlFor="ustadz">
          <Input id="ustadz" name="ustadz" placeholder="Ust. Fulan" defaultValue={initial?.ustadz ?? ""} />
        </Field>
        <Field label="Jadwal" htmlFor="frequency">
          <NativeSelect id="frequency" name="frequency" defaultValue={initial?.frequency ?? "SETIAP_PEKAN"}>
            {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Peserta (opsional)" htmlFor="audience">
          <Input id="audience" name="audience" list="kajian-audience" placeholder="Umum" defaultValue={initial?.audience ?? ""} />
          <datalist id="kajian-audience">
            {["Umum", "Bapak-bapak", "Ibu-ibu", "Remaja", "Anak-anak (TPA)"].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <Field label="Tempat (opsional)" htmlFor="location">
          <Input id="location" name="location" placeholder="Ruang utama" defaultValue={initial?.location ?? ""} />
        </Field>
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Kajian rutin tersimpan.</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Loader2 className="animate-spin" /> : initial ? <Save /> : <Plus />}{" "}
          {initial ? "Simpan Perubahan" : "Tambah Kajian Rutin"}
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
