import type { Metadata } from "next";
import { Search } from "lucide-react";
import { UserRow } from "@/components/admin/user-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { formatDate } from "@/lib/format";
import { requireSuperadmin } from "@/lib/session";
import { listUsersForAdmin, parseUserFilter } from "@/lib/superadmin-queries";
import { deleteUser, resetUserPassword, setUserRole } from "../actions";

export const metadata: Metadata = { title: "Pengguna · Superadmin", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string; peran?: string; hal?: string }> };

export default async function PenggunaPage({ searchParams }: Props) {
  const me = await requireSuperadmin();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const filter = parseUserFilter(sp.peran);
  const list = await listUsersForAdmin({ q, filter, page: Math.max(1, Number(sp.hal) || 1) });
  const href = (p: number) => `/superadmin/pengguna?${new URLSearchParams({ ...(q ? { q } : {}), peran: filter, hal: String(p) })}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengguna</CardTitle>
        <CardDescription>Cari akun, buat password sementara, ubah peran, atau hapus akun. Akun Anda sendiri tidak bisa diubah dari sini.</CardDescription>
        <form className="mt-2 flex flex-wrap items-center gap-2" method="GET">
          <Input name="q" defaultValue={q} placeholder="Cari nama atau email…" className="max-w-xs" aria-label="Cari pengguna" />
          <NativeSelect name="peran" defaultValue={filter} className="w-auto" aria-label="Filter peran">
            <option value="semua">Semua peran</option>
            <option value="SUPERADMIN">Superadmin</option>
            <option value="DKM_ADMIN">Admin DKM</option>
            <option value="BENDAHARA">Bendahara</option>
            <option value="tanpa-masjid">Tanpa masjid</option>
          </NativeSelect>
          <Button type="submit" variant="outline">
            <Search /> Cari
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        {list.rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tidak ada pengguna yang cocok.</p>
        ) : (
          <ul className="divide-y">
            {list.rows.map((u) => (
              <UserRow
                key={u.id}
                user={{ ...u, createdAt: formatDate(u.createdAt) }}
                isSelf={u.id === me.id}
                onResetPassword={resetUserPassword.bind(null, u.id)}
                onSetRole={setUserRole.bind(null, u.id)}
                onDelete={deleteUser.bind(null, u.id)}
              />
            ))}
          </ul>
        )}
        <PaginationLinks page={list.page} pages={list.pages} total={list.total} noun="pengguna" hrefFor={href} />
      </CardContent>
    </Card>
  );
}
