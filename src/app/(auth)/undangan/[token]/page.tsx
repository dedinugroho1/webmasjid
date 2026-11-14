import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invitations, tenants } from "@/db/schema";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";
import { getSession } from "@/lib/session";
import { hashToken } from "@/lib/tokens";
import { acceptInvitation } from "./actions";

export const metadata: Metadata = { title: "Undangan Pengurus", robots: { index: false } };

export default async function UndanganPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [row] = await db
    .select({ role: invitations.role, masjid: tenants.name })
    .from(invitations)
    .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
    .where(and(eq(invitations.tokenHash, hashToken(token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Undangan tidak berlaku</CardTitle>
          <CardDescription>Link sudah dipakai, dibatalkan, atau kedaluwarsa. Minta Admin DKM membuat link baru.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/masuk">Ke halaman masuk</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const session = await getSession();
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Undangan Pengurus</CardTitle>
        <CardDescription>
          Anda diundang menjadi <b>{ROLE_LABELS[row.role]}</b> di <b>{row.masjid}</b>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteForm action={acceptInvitation.bind(null, token)} loggedInAs={session?.user.email} />
      </CardContent>
    </Card>
  );
}
