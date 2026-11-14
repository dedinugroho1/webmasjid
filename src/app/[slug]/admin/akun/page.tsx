import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { ROLE_LABELS } from "@/lib/constants";
import { requireTenantAccess } from "@/lib/session";
import { changeOwnPassword } from "./actions";

export default async function AkunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ diganti?: string }>;
}) {
  const { slug } = await params;
  const { diganti } = await searchParams;
  const { user, tenant } = await requireTenantAccess(slug);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Akun Saya</h1>
        <p className="text-muted-foreground text-sm">
          {user.name} · {user.email} · {ROLE_LABELS[user.role]} {tenant.name}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
          <CardDescription>Setelah diganti, akun Anda otomatis keluar dari perangkat lain.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {diganti && (
            <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              Password diganti. Perangkat lain telah dikeluarkan.
            </p>
          )}
          <ChangePasswordForm action={changeOwnPassword.bind(null, slug)} />
        </CardContent>
      </Card>
    </div>
  );
}
