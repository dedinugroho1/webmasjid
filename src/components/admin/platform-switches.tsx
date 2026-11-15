"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SwitchProps = { label: string; description: string; checked: boolean; onChange: (next: boolean) => Promise<void>; testId: string };

function Switch({ label, description, checked, onChange, testId }: SwitchProps) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
        disabled={pending}
        onClick={() => start(() => onChange(!checked))}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        {pending ? (
          <Loader2 className="mx-auto size-4 animate-spin" />
        ) : (
          <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
        )}
      </button>
    </div>
  );
}

export function PlatformSwitches({
  registrationOpen,
  moderationEnabled,
  onRegistration,
  onModeration,
}: {
  registrationOpen: boolean;
  moderationEnabled: boolean;
  onRegistration: (open: boolean) => Promise<void>;
  onModeration: (enabled: boolean) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Switch
        testId="switch-registration"
        label="Pendaftaran masjid dibuka"
        description="Matikan untuk menutup pendaftaran masjid baru (mis. saat ada serangan spam)."
        checked={registrationOpen}
        onChange={onRegistration}
      />
      <Switch
        testId="switch-moderation"
        label="Moderasi masjid baru"
        description="Aktif: masjid baru tidak tampil di direktori & Google sampai Anda setujui. Dashboard-nya tetap bisa dipakai."
        checked={moderationEnabled}
        onChange={onModeration}
      />
    </div>
  );
}
