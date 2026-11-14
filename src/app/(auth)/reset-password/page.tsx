import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata: Metadata = { title: "Atur Ulang Password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Atur Ulang Password</CardTitle>
        <CardDescription>Buat password baru untuk akun pengurus Anda.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-destructive text-sm">
            Link reset tidak valid atau sudah kedaluwarsa.{" "}
            <Link href="/lupa-password" className="underline">
              Minta link baru
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
