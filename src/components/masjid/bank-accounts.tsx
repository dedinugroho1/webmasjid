"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { BankAccount } from "@/db/schema";
import { Button } from "@/components/ui/button";

export function BankAccounts({ accounts }: { accounts: BankAccount[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!accounts.length) return null;
  return (
    <ul className="grid gap-2">
      {accounts.map((a) => (
        <li key={`${a.bank}-${a.number}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium uppercase">{a.bank}</p>
            <p className="font-mono text-lg font-semibold tracking-wide">{a.number}</p>
            <p className="text-muted-foreground truncate text-sm">a.n. {a.holder}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Salin nomor rekening ${a.bank}`}
            onClick={async () => {
              await navigator.clipboard.writeText(a.number.replace(/\s/g, ""));
              setCopied(a.number);
              setTimeout(() => setCopied(null), 1500);
            }}
          >
            {copied === a.number ? <Check className="text-primary" /> : <Copy />}
          </Button>
        </li>
      ))}
    </ul>
  );
}
