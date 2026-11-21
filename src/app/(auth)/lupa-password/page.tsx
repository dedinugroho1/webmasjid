import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestResetForm } from "@/components/auth/password-reset-forms";
import { emailEnabled } from "@/lib/email";

export const metadata: Metadata = { title: "Lupa Password" };

export default async function LupaPasswordPage() {
  // Status email dibaca dari environment saat request, bukan saat build.
  await connection();
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Lupa Password</CardTitle>
        <CardDescription>Masukkan email akun pengurus untuk menerima tautan atur ulang password.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {emailEnabled() ? (
          <RequestResetForm />
        ) : (
          <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-950">
            Pengiriman email belum diaktifkan di server ini. Minta <b>Admin DKM</b> masjid Anda membuat password sementara
            melalui menu <b>Pengurus</b>.
          </p>
        )}
        <Link href="/masuk" className="text-primary text-center text-sm hover:underline">
          Kembali ke halaman masuk
        </Link>
      </CardContent>
    </Card>
  );
}
