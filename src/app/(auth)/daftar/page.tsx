import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { appUrl, registrationOpen } from "@/lib/utils";

export const metadata: Metadata = { title: "Daftarkan Masjid" };

export default function DaftarPage() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-xl">Daftarkan Masjid Anda</CardTitle>
        <CardDescription>
          Gratis selamanya. Website masjid Anda langsung aktif lengkap dengan jadwal sholat, buku kas, dan infaq digital.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {registrationOpen() ? (
          <RegisterForm baseUrl={appUrl()} />
        ) : (
          <p className="text-muted-foreground text-sm">Pendaftaran masjid baru sedang ditutup di instance ini.</p>
        )}
        <p className="text-muted-foreground text-center text-sm">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="text-primary font-medium hover:underline">
            Masuk
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
