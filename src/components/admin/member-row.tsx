"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, UserMinus } from "lucide-react";
import type { ResetResult } from "@/app/[slug]/admin/pengurus/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";

type Props = {
  member: { id: string; name: string; email: string; role: UserRole };
  isSelf: boolean;
  onRoleChange: (role: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onResetPassword: () => Promise<ResetResult>;
};

export function MemberRow({ member, isSelf, onRoleChange, onRemove, onResetPassword }: Props) {
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="grid gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {member.name} {isSelf && <Badge variant="secondary">Anda</Badge>}
          </p>
          <p className="text-muted-foreground truncate text-sm">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSelf ? (
            <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
          ) : (
            <>
              <NativeSelect
                aria-label={`Peran ${member.name}`}
                className="w-auto"
                defaultValue={member.role}
                disabled={pending}
                onChange={(e) => start(() => onRoleChange(e.target.value))}
              >
                <option value="DKM_ADMIN">{ROLE_LABELS.DKM_ADMIN}</option>
                <option value="BENDAHARA">{ROLE_LABELS.BENDAHARA}</option>
              </NativeSelect>
              <Button
                variant="outline"
                size="icon"
                title="Atur password sementara"
                aria-label={`Atur password sementara untuk ${member.name}`}
                disabled={pending}
                onClick={() =>
                  confirm(`Buat password sementara untuk ${member.name}? Ia akan dikeluarkan dari semua perangkat.`) &&
                  start(async () => {
                    const res = await onResetPassword();
                    if (res.ok) {
                      setTemp(res.password);
                      setError(null);
                    } else setError(res.error);
                  })
                }
              >
                <KeyRound />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Keluarkan dari pengurus"
                aria-label={`Keluarkan ${member.name}`}
                disabled={pending}
                onClick={() => confirm(`Keluarkan ${member.name} dari pengurus masjid?`) && start(() => onRemove())}
              >
                {pending ? <Loader2 className="animate-spin" /> : <UserMinus className="text-destructive" />}
              </Button>
            </>
          )}
        </div>
      </div>
      {temp && (
        <p className="rounded-md bg-amber-100 p-2 text-sm text-amber-950">
          Password sementara: <code className="font-mono font-semibold">{temp}</code> — sampaikan langsung ke {member.name} dan minta
          ia menggantinya setelah masuk.
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </li>
  );
}
