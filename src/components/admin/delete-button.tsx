"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteButton({ action, confirmText = "Hapus data ini?" }: { action: () => Promise<void>; confirmText?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Hapus"
      disabled={pending}
      onClick={() => confirm(confirmText) && start(() => action())}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
    </Button>
  );
}
