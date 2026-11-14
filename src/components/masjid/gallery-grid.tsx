"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/db/schema";

type Item = Pick<GalleryItem, "id" | "imageUrl" | "caption" | "takenAt">;

export function GalleryGrid({ items }: { items: Item[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  if (!items.length) return <p className="text-muted-foreground text-sm">Belum ada foto kegiatan.</p>;
  const current = items[index];
  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const step = (d: number) => setIndex((i) => (i + d + items.length) % items.length);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((g, i) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group block w-full overflow-hidden rounded-lg border"
              aria-label={`Lihat foto: ${g.caption ?? "kegiatan masjid"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.imageUrl}
                alt={g.caption ?? ""}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        className="m-auto max-w-[95vw] bg-transparent p-0 backdrop:bg-black/85"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <figure className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.imageUrl} alt={current.caption ?? ""} className="max-h-[80vh] w-auto rounded-lg object-contain" />
          {current.caption && <figcaption className="mt-2 text-center text-sm text-white">{current.caption}</figcaption>}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white"
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white"
                aria-label="Foto berikutnya"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </figure>
      </dialog>
    </>
  );
}
