"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./field";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function AcceptInviteForm({ action, loggedInAs }: { action: Action; loggedInAs?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      {loggedInAs ? (
        <p className="text-sm">
          Anda masuk sebagai <b>{loggedInAs}</b>. Akun ini akan dijadikan pengurus masjid tersebut.
        </p>
      ) : (
        <>
          <Field label="Nama Lengkap" htmlFor="name" error={state?.fieldErrors?.name}>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
          <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </>
      )}
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} {loggedInAs ? "Gabung sebagai Pengurus" : "Buat Akun & Gabung"}
      </Button>
    </form>
  );
}
