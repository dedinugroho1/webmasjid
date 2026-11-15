import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { getDemoTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Masuk Pengurus" };

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string; demo?: string }> }) {
  const { next, error, reset, demo } = await searchParams;
  const demoTenant = demo ? await getDemoTenant().catch(() => null) : null;
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
        {error === "suspended" && (
          <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900">
            Website masjid ini sedang ditangguhkan oleh pengelola platform. Hubungi admin WebMasjid untuk informasi lebih lanjut.
          </p>
        )}
        {reset && (
          <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">Password berhasil diganti. Silakan masuk.</p>
        )}
        {demoTenant && (
          <p className="border-primary/30 bg-primary/5 rounded-md border p-3 text-sm">
            Akun demo <b>{demoTenant.name}</b> sudah terisi — klik <b>Masuk</b> untuk menjelajahi dashboard. Perubahan pada
            masjid demo tidak disimpan.
          </p>
        )}
        <SignInForm
          next={next}
          defaultEmail={demoTenant ? DEMO_ACCOUNT.email : undefined}
          defaultPassword={demoTenant ? DEMO_ACCOUNT.password : undefined}
        />
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
