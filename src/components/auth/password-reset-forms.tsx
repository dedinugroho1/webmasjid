"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { Loader2 } from "lucide-react";
import { requestResetAction, resetPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./field";

export function RequestResetForm() {
  const [state, action, pending] = useActionForm(requestResetAction, null);
  if (state?.sent) {
    return (
      <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
        Jika email tersebut terdaftar, tautan untuk mengatur ulang password telah dikirim. Periksa kotak masuk & folder spam.
      </p>
    );
  }
  const fe = state?.fieldErrors;
  return (
    <form onSubmit={action} className="grid gap-4">
      <Field label="Email akun pengurus" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Kirim Link Reset
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionForm(resetPasswordAction, null);
  return (
    <form onSubmit={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Password baru" htmlFor="newPassword" error={state?.fieldErrors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Ulangi password baru" htmlFor="confirmPassword" error={state?.fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Simpan Password Baru
      </Button>
    </form>
  );
}
