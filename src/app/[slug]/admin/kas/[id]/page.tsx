import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cashTransactions } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/admin/transaction-form";
import { todayISO } from "@/lib/format";
import { requireTenantAccess } from "@/lib/session";
import { updateTransaction } from "../actions";

export default async function EditTransaksiPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN", "BENDAHARA"]);
  const [tx] = await db
    .select()
    .from(cashTransactions)
    .where(and(eq(cashTransactions.id, id), eq(cashTransactions.tenantId, tenant.id)))
    .limit(1);
  if (!tx) notFound();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Edit Transaksi</CardTitle>
        <CardDescription>Perubahan langsung tampil di halaman publik & laporan kas.</CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionForm
          action={updateTransaction.bind(null, slug, tx.id)}
          today={todayISO(tenant.timezone)}
          initial={{
            type: tx.type,
            fund: tx.fund,
            category: tx.category,
            amount: tx.amount,
            description: tx.description,
            transactionDate: tx.transactionDate,
            receiptUrl: tx.receiptUrl,
          }}
          cancelHref={`/${slug}/admin/kas?bulan=${tx.transactionDate.slice(0, 7)}`}
        />
      </CardContent>
    </Card>
  );
}
