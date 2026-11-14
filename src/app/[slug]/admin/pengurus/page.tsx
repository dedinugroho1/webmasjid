import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/admin/delete-button";
import { InviteForm } from "@/components/admin/invite-form";
import { MemberRow } from "@/components/admin/member-row";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import {
  createInvitation,
  removeMember,
  resetMemberPassword,
  revokeInvitation,
  updateMemberRole,
} from "./actions";

export default async function PengurusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenant, user } = await requireTenantAccess(slug, ["DKM_ADMIN"]);

  const [members, pending] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.tenantId, tenant.id))
      .orderBy(asc(users.createdAt)),
    db
      .select()
      .from(invitations)
      .where(and(eq(invitations.tenantId, tenant.id), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())))
      .orderBy(desc(invitations.createdAt)),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Pengurus</h1>
        <p className="text-muted-foreground text-sm">
          Undang bendahara atau admin lain. Bendahara hanya dapat mengakses Buku Kas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Undang Pengurus</CardTitle>
          <CardDescription>Buat link undangan lalu kirim lewat WhatsApp. Calon pengurus membuat akun sendiri dari link tersebut.</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm action={createInvitation.bind(null, slug)} masjidName={tenant.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengurus</CardTitle>
          <CardDescription>{members.length} akun terhubung dengan {tenant.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {members
              .filter((m) => m.role !== "SUPERADMIN")
              .map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isSelf={m.id === user.id}
                  onRoleChange={updateMemberRole.bind(null, slug, m.id)}
                  onRemove={removeMember.bind(null, slug, m.id)}
                  onResetPassword={resetMemberPassword.bind(null, slug, m.id)}
                />
              ))}
          </ul>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Undangan Aktif</CardTitle>
            <CardDescription>Belum digunakan. Batalkan bila link tersebar ke orang yang salah.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {pending.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      <Badge variant="outline">{ROLE_LABELS[inv.role]}</Badge> {inv.note ?? "Tanpa catatan"}
                    </p>
                    <p className="text-muted-foreground text-xs">Berlaku hingga {formatDateTime(inv.expiresAt, tenant.timezone)}</p>
                  </div>
                  <DeleteButton action={revokeInvitation.bind(null, slug, inv.id)} confirmText="Batalkan undangan ini?" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
