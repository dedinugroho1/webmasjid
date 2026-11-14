"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tombol aksi kecil tanpa konfirmasi (mis. aktif/nonaktif). */
export function ToggleButton({ label, action }: { label: string; action: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => action())}>
      {pending && <Loader2 className="animate-spin" />} {label}
    </Button>
  );
}
