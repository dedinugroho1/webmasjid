import Link from "next/link";
import { Landmark } from "lucide-react";
import { SuperadminTabs } from "@/components/admin/superadmin-tabs";
import { requireSuperadmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSuperadmin();
  return (
    <div className="bg-muted/40 min-h-dvh">
      <header className="bg-background border-b">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Landmark className="text-primary size-5" /> WebMasjid · Superadmin
          </Link>
          <SuperadminTabs />
          <p className="text-muted-foreground text-xs">{me.email}</p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
