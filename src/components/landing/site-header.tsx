import Link from "next/link";
import { GitBranch, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { githubUrl } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Landmark className="text-primary size-6" /> WebMasjid
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
          <a href="#fitur" className="hover:text-foreground">Fitur</a>
          <a href="#direktori" className="hover:text-foreground">Direktori</a>
          <a href="#open-source" className="hover:text-foreground">Self-Host</a>
          <a href="#jasa" className="hover:text-foreground">Jasa Pasang</a>
          <a href="#donasi" className="hover:text-foreground">Donasi</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="GitHub">
            <a href={githubUrl()} target="_blank" rel="noreferrer">
              <GitBranch />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/masuk">Masuk</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
