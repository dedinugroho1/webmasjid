"use client";

import { useTransition } from "react";
import { Loader2, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PinButton({ pinned, action }: { pinned: boolean; action: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={pinned ? "Lepas sematan" : "Sematkan"}
      disabled={pending}
      onClick={() => start(() => action())}
    >
      {pending ? <Loader2 className="animate-spin" /> : pinned ? <PinOff /> : <Pin />}
    </Button>
  );
}
