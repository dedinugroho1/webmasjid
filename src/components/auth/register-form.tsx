"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { registerAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CITIES } from "@/lib/cities";
import { slugify } from "@/lib/utils";
import { Field } from "./field";

export function RegisterForm({ baseUrl }: { baseUrl: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const host = baseUrl.replace(/^https?:\/\//, "");

  return (
    <form action={action} className="grid gap-4">
      {/* Honeypot anti-bot: disembunyikan dari manusia & pembaca layar. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Nama Masjid" htmlFor="masjidName" error={state?.fieldErrors?.masjidName}>
        <Input
          id="masjidName"
          name="masjidName"
          placeholder="Masjid Al-Ikhlas"
          required
          onChange={(e) => !slugTouched && setSlug(slugify(e.target.value.replace(/^masjid\s+/i, "")))}
        />
      </Field>
      <Field
        label="Alamat Website"
        htmlFor="slug"
        error={state?.fieldErrors?.slug}
        hint={
          <>
            {host}/<b>{slug || "nama-masjid"}</b>
          </>
        }
      >
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="al-ikhlas"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kota" htmlFor="city" error={state?.fieldErrors?.city}>
          <NativeSelect id="city" name="city" defaultValue="Jakarta" required>
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Nama Pengurus (Admin DKM)" htmlFor="adminName" error={state?.fieldErrors?.adminName}>
          <Input id="adminName" name="adminName" autoComplete="name" required />
        </Field>
      </div>
      <Field label="Alamat Masjid (opsional)" htmlFor="address" error={state?.fieldErrors?.address}>
        <Input id="address" name="address" placeholder="Jl. Contoh No. 1, Kelurahan, Kecamatan" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Daftarkan Masjid — Gratis
      </Button>
    </form>
  );
}
