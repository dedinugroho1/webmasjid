"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import type { UserActionResult, UserResetResult } from "@/app/superadmin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";

type Props = {
  user: { id: string; name: string; email: string; role: UserRole; createdAt: string; tenantName: string | null; tenantSlug: string | null };
  isSelf: boolean;
  onResetPassword: () => Promise<UserResetResult>;
  onSetRole: (role: string) => Promise<UserActionResult>;
  onDelete: () => Promise<UserActionResult>;
};

export function UserRow({ user, isSelf, onResetPassword, onSetRole, onDelete }: Props) {
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<UserActionResult | UserResetResult>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setError(null);
        if ("password" in res) setTemp(res.password);
      } else setError(res.error);
    });

  return (
    <li className="grid gap-2 py-3" data-testid={`user-${user.email}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {user.name} {isSelf && <Badge variant="secondary">Anda</Badge>}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {user.email} · daftar {user.createdAt} ·{" "}
            {user.tenantSlug ? (
              <Link href={`/${user.tenantSlug}/admin`} className="text-primary underline">
                {user.tenantName}
              </Link>
            ) : (
              "tanpa masjid"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelf ? (
            <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
          ) : (
            <>
              <NativeSelect
                aria-label={`Peran ${user.email}`}
                className="w-auto"
                defaultValue={user.role}
                disabled={pending}
                onChange={(e) => run(() => onSetRole(e.target.value))}
              >
                <option value="DKM_ADMIN">{ROLE_LABELS.DKM_ADMIN}</option>
                <option value="BENDAHARA">{ROLE_LABELS.BENDAHARA}</option>
                <option value="SUPERADMIN">{ROLE_LABELS.SUPERADMIN}</option>
              </NativeSelect>
              <Button
                variant="outline"
                size="icon"
                title="Buat password sementara"
                aria-label={`Password sementara ${user.email}`}
                disabled={pending}
                onClick={() => confirm(`Buat password sementara untuk ${user.email}? Ia akan dikeluarkan dari semua perangkat.`) && run(onResetPassword)}
              >
                <KeyRound />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Hapus akun"
                aria-label={`Hapus akun ${user.email}`}
                disabled={pending}
                onClick={() => confirm(`Hapus akun ${user.email} secara permanen?`) && run(onDelete)}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
              </Button>
            </>
          )}
        </div>
      </div>
      {temp && (
        <p className="rounded-md bg-amber-100 p-2 text-sm text-amber-950" data-testid="temp-password">
          Password sementara: <code className="font-mono font-semibold">{temp}</code> — sampaikan langsung ke {user.name}.
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </li>
  );
}
