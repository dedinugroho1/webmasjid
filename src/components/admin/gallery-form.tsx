"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import type { GalleryState } from "@/app/[slug]/admin/galeri/actions";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/compress-image";

type Action = (prev: GalleryState, formData: FormData) => Promise<GalleryState>;

export function GalleryForm({ action, today }: { action: Action; today: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPreview(null);
    }
  }, [state]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    setProcessing(true);
    try {
      const small = await compressImage(file);
      // Ganti isi input file dengan hasil kompresi.
      const dt = new DataTransfer();
      dt.items.add(small);
      if (fileRef.current) fileRef.current.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <Field label="Foto Kegiatan" htmlFor="image" error={state?.fieldErrors?.image} hint="Foto otomatis diperkecil sebelum diunggah.">
        <Input ref={fileRef} id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} required />
      </Field>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Pratinjau" className="max-h-48 w-fit rounded-md border object-contain" />
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Keterangan" htmlFor="caption" error={state?.fieldErrors?.caption}>
          <Input id="caption" name="caption" placeholder="mis. Santunan anak yatim Ramadhan" />
        </Field>
        <Field label="Tanggal" htmlFor="takenAt" error={state?.fieldErrors?.takenAt}>
          <Input id="takenAt" name="takenAt" type="date" defaultValue={today} />
        </Field>
      </div>
      {state?.ok && <p className="text-sm text-emerald-700">Foto ditambahkan ke galeri.</p>}
      <Button type="submit" disabled={pending || processing}>
        {pending || processing ? <Loader2 className="animate-spin" /> : <ImagePlus />} Unggah Foto
      </Button>
    </form>
  );
}
