import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Masuk Pengurus" };

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const { next, error, reset } = await searchParams;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Masuk Pengurus DKM</CardTitle>
        <CardDescription>Kelola buku kas, agenda, dan pengaturan masjid Anda.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error === "forbidden" && (
          <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900">
            Akun Anda tidak memiliki akses ke masjid tersebut. Silakan masuk dengan akun pengurusnya.
          </p>
        )}
        {reset && (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">Password berhasil diganti. Silakan masuk.</p>
        )}
        <SignInForm next={next} />
        <Link href="/lupa-password" className="text-muted-foreground -mt-2 text-right text-sm hover:underline">
          Lupa password?
        </Link>
        <p className="text-muted-foreground text-center text-sm">
          Belum terdaftar?{" "}
          <Link href="/daftar" className="text-primary font-medium hover:underline">
            Daftarkan masjid
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
