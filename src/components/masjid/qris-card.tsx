"use client";

import { useRef } from "react";
import { Download, ZoomIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrisCard({ src, name }: { src: string; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border bg-white p-3 transition hover:shadow-md"
        aria-label="Perbesar QRIS"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`QRIS ${name}`} className="size-56 object-contain" />
      </button>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => dialogRef.current?.showModal()}>
          <ZoomIn /> Perbesar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={src} download={`qris-${name.toLowerCase().replace(/\s+/g, "-")}.png`}>
            <Download /> Unduh
          </a>
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        className="m-auto rounded-xl p-0 backdrop:bg-black/70"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      >
        <div className="relative bg-white p-4">
          <button
            type="button"
            className="absolute top-2 right-2 rounded-full bg-black/10 p-1"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`QRIS ${name}`} className="max-h-[85vh] w-auto max-w-[90vw] object-contain" />
        </div>
      </dialog>
    </div>
  );
}
