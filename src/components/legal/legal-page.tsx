import Link from "next/link";
import { Landmark } from "lucide-react";

/** Kerangka halaman hukum (Kebijakan Privasi, Syarat & Ketentuan). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Landmark className="text-primary size-6" /> WebMasjid
          </Link>
          <nav className="text-muted-foreground flex gap-4 text-sm">
            <Link href="/privasi" className="hover:text-foreground">
              Privasi
            </Link>
            <Link href="/syarat" className="hover:text-foreground">
              Syarat
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Berlaku sejak {updated}</p>
        <div className="mt-8 grid gap-8 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5 [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}

/** Satu pasal bernomor di dalam halaman hukum. */
export function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2>
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
