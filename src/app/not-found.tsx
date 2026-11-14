import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-primary text-sm font-semibold">404</p>
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground max-w-md">
        Masjid atau halaman yang Anda cari belum terdaftar di WebMasjid.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">Beranda</Link>
        </Button>
        <Button asChild>
          <Link href="/daftar">Daftarkan Masjid</Link>
        </Button>
      </div>
    </main>
  );
}
