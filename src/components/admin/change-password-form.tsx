"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { Loader2 } from "lucide-react";
import type { PasswordState } from "@/app/[slug]/admin/akun/actions";
import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = (prev: PasswordState, formData: FormData) => Promise<PasswordState>;

export function ChangePasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionForm(action, null);
  const fe = state?.fieldErrors;
  return (
    <form onSubmit={formAction} className="grid gap-4 sm:grid-cols-3 sm:items-start">
      <Field label="Password saat ini" htmlFor="currentPassword" error={fe?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Password baru" htmlFor="newPassword" error={fe?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Ulangi password baru" htmlFor="confirmPassword" error={fe?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Ganti Password
        </Button>
      </div>
    </form>
  );
}
