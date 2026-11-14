"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Tombol salin / kirim WhatsApp / cetak untuk teks laporan. */
export function ReportShare({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin Teks"}
      </Button>
      <Button asChild variant="outline">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          <MessageCircle /> Kirim ke WhatsApp
        </a>
      </Button>
      <Button type="button" variant="outline" onClick={() => window.print()}>
        <Printer /> Cetak
      </Button>
    </div>
  );
}
