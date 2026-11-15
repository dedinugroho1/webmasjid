import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { createFormToken } from "@/lib/spam";
import { getPlatformSettings } from "@/lib/platform-settings";
import { appUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Daftarkan Masjid" };
// Dirender per permintaan agar token waktu form selalu baru.
export const dynamic = "force-dynamic";

export default async function DaftarPage() {
  const settings = await getPlatformSettings();
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-xl">Daftarkan Masjid Anda</CardTitle>
        <CardDescription>
          Gratis selamanya. Website masjid Anda langsung aktif lengkap dengan buku kas, petugas Jumat, kajian rutin, dan jadwal sholat.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {settings.registrationOpen && settings.moderationEnabled && (
          <p className="bg-muted/60 rounded-md border p-3 text-sm" data-testid="moderation-note">
            Masjid baru diperiksa dulu oleh pengelola sebelum tampil di direktori publik. Dashboard Anda tetap bisa langsung
            dipakai.
          </p>
        )}
        {settings.registrationOpen ? (
          <RegisterForm baseUrl={appUrl()} formToken={createFormToken()} />
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
