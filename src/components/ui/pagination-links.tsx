import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Navigasi halaman sederhana berbasis tautan (aman dipakai di Server Component). */
export function PaginationLinks({ page, pages, hrefFor, total, noun = "data" }: { page: number; pages: number; hrefFor: (page: number) => string; total?: number; noun?: string }) {
  if (pages <= 1 && total === undefined) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm" aria-label="Halaman">
      <span className="text-muted-foreground">
        {total !== undefined ? `${total.toLocaleString("id-ID")} ${noun} · ` : ""}Halaman {page} dari {pages}
      </span>
      {pages > 1 && (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} rel="prev">
                <ChevronLeft /> Sebelumnya
              </Link>
            ) : (
              <span aria-disabled="true" className="pointer-events-none opacity-50">
                <ChevronLeft /> Sebelumnya
              </span>
            )}
          </Button>
          <Button asChild variant="outline" size="sm" disabled={page >= pages}>
            {page < pages ? (
              <Link href={hrefFor(page + 1)} rel="next">
                Berikutnya <ChevronRight />
              </Link>
            ) : (
              <span aria-disabled="true" className="pointer-events-none opacity-50">
                Berikutnya <ChevronRight />
              </span>
            )}
          </Button>
        </div>
      )}
    </nav>
  );
}
