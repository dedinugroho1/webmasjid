"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import type { DeleteMasjidState } from "@/app/[slug]/admin/pengaturan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";

type Action = (prev: DeleteMasjidState, formData: FormData) => Promise<DeleteMasjidState>;

/** Zona berbahaya: hapus masjid dan seluruh datanya secara permanen. */
export function DeleteMasjidForm({ action, slug, name }: { action: Action; slug: string; name: string }) {
  const [state, onSubmit, pending] = useActionForm(action, null);
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <TriangleAlert className="size-5" /> Hapus Masjid
        </CardTitle>
        <CardDescription>
          Menghapus <b>{name}</b> beserta seluruh isinya secara <b>permanen</b>: buku kas, petugas Jumat, kajian, agenda,
          pengumuman, galeri & foto, semua akun pengurus, dan alamat <code>/{slug}</code>. Tidak dapat dipulihkan.
          Unduh dulu laporan kas (PDF/Excel) bila masih dibutuhkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            if (!confirm(`Hapus ${name} dan semua datanya secara permanen?`)) return e.preventDefault();
            onSubmit(e);
          }}
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <label className="grid gap-1.5 text-sm font-medium">
            Ketik <code className="bg-muted rounded px-1.5">{slug}</code> untuk mengonfirmasi
            <Input name="confirm" autoComplete="off" placeholder={slug} required />
          </label>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Hapus Masjid Permanen
          </Button>
          {state?.error && <p className="text-destructive text-sm sm:col-span-2">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
