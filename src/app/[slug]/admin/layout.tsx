import Link from "next/link";
import { Landmark } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ROLE_LABELS } from "@/lib/constants";
import { isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const access = await requireTenantAccess(slug);
  const { tenant, user } = access;
  const canManage = user.role !== "BENDAHARA";

  return (
    <div className="bg-muted/40 min-h-dvh print:bg-white">
      <header className="bg-background sticky top-0 z-20 border-b print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href={`/${tenant.slug}/admin`} className="flex min-w-0 items-center gap-2 font-semibold">
            <Landmark className="text-primary size-5 shrink-0" />
            <span className="truncate">{tenant.name}</span>
          </Link>
          <div className="text-right text-xs leading-tight">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_minmax(0,1fr)] print:block print:p-0">
        <aside className="min-w-0 md:sticky md:top-20 md:self-start print:hidden">
          <AdminNav slug={tenant.slug} canManage={canManage} />
        </aside>
        <main className="min-w-0">
          {isReadOnlyDemo(access) && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 print:hidden">
              <b>Mode demo</b> — silakan jelajahi semua menu, tetapi perubahan tidak disimpan.{" "}
              <Link href="/daftar" className="font-medium underline">
                Daftarkan masjid Anda
              </Link>{" "}
              untuk mulai memakai WebMasjid.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
