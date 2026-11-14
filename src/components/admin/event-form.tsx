"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { EventFormState } from "@/app/[slug]/admin/agenda/actions";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPE_LABELS } from "@/lib/constants";

type Action = (prev: EventFormState, formData: FormData) => Promise<EventFormState>;

export function EventForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [type, setType] = useState("KAJIAN");
  const formRef = useRef<HTMLFormElement>(null);
  const isJumat = type === "JUMAT";

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis Agenda" htmlFor="type">
          <NativeSelect id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Tanggal & Jam" htmlFor="dateTime" error={state?.fieldErrors?.dateTime}>
          <Input id="dateTime" name="dateTime" type="datetime-local" required />
        </Field>
      </div>
      <Field label={isJumat ? "Tema Khutbah" : "Judul / Tema"} htmlFor="title" error={state?.fieldErrors?.title}>
        <Input
          id="title"
          name="title"
          placeholder={isJumat ? "Sholat Jumat — Menjaga Amanah" : "Kajian Tafsir Juz 30"}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={isJumat ? "Khatib" : "Penceramah / Pemateri"} htmlFor="speaker">
          <Input id="speaker" name="speaker" placeholder="Ust. Fulan, Lc." />
        </Field>
        {isJumat ? (
          <Field label="Imam" htmlFor="imam">
            <Input id="imam" name="imam" placeholder="Ust. Fulan" />
          </Field>
        ) : (
          <Field label="Lokasi" htmlFor="location">
            <Input id="location" name="location" placeholder="Ruang utama masjid" />
          </Field>
        )}
      </div>
      <Field label="Keterangan (opsional)" htmlFor="description">
        <Textarea id="description" name="description" rows={3} placeholder="Rutin setiap Ahad ba'da Subuh…" />
      </Field>
      {state?.ok && <p className="text-sm text-emerald-700">Agenda tersimpan.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Simpan Agenda
      </Button>
    </form>
  );
}
