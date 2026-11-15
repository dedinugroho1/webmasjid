"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cashTransactions } from "@/db/schema";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";
import { deleteImage, uploadImage } from "@/lib/storage";

export type KasFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const KAS_ROLES = ["DKM_ADMIN", "BENDAHARA"] as const;

const txSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  fund: z.enum(["OPERASIONAL", "PEMBANGUNAN"]),
  category: z.string().trim().min(1, "Kategori wajib diisi").max(80),
  // Terima format "1.500.000" atau "1500000".
  amount: z
    .string()
    .transform((v) => Number(v.replace(/[^\d]/g, "")))
    .pipe(z.number().int().positive("Nominal harus lebih dari 0").max(1_000_000_000_000)),
  description: z.string().trim().max(300).optional(),
  transactionDate: z.iso.date("Tanggal tidak valid"),
});

function parseTransaction(formData: FormData) {
  return txSchema.safeParse({
    type: formData.get("type"),
    fund: formData.get("fund"),
    category: formData.get("category"),
    amount: formData.get("amount") ?? "",
    description: formData.get("description") || undefined,
    transactionDate: formData.get("transactionDate"),
  });
}

export async function createTransaction(slug: string, _prev: KasFormState, formData: FormData): Promise<KasFormState> {
  const access = await requireTenantAccess(slug, [...KAS_ROLES]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = parseTransaction(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let receiptUrl: string | null = null;
  try {
    receiptUrl = await uploadImage(formData.get("receipt"), `${tenant.id}/receipts`);
  } catch (e) {
    return { fieldErrors: { receipt: [(e as Error).message] } };
  }

  await db.insert(cashTransactions).values({
    ...parsed.data,
    description: parsed.data.description || null,
    tenantId: tenant.id, // selalu dari tenant terverifikasi, bukan dari input form
    receiptUrl,
    createdBy: user.id,
  });

  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export async function updateTransaction(
  slug: string,
  id: string,
  _prev: KasFormState,
  formData: FormData,
): Promise<KasFormState> {
  const access = await requireTenantAccess(slug, [...KAS_ROLES]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = parseTransaction(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  // Bukti: tetap, diganti file baru, atau dihapus.
  let receipt: { receiptUrl?: string | null } = {};
  try {
    const uploaded = await uploadImage(formData.get("receipt"), `${tenant.id}/receipts`);
    if (uploaded) receipt = { receiptUrl: uploaded };
    else if (formData.get("remove_receipt") === "on") receipt = { receiptUrl: null };
  } catch (e) {
    return { fieldErrors: { receipt: [(e as Error).message] } };
  }

  // Bukti lama dihapus dari penyimpanan hanya bila diganti/dihapus & update berhasil.
  const [before] =
    "receiptUrl" in receipt
      ? await db
          .select({ receiptUrl: cashTransactions.receiptUrl })
          .from(cashTransactions)
          .where(and(eq(cashTransactions.id, id), eq(cashTransactions.tenantId, tenant.id)))
          .limit(1)
      : [];

  const updated = await db
    .update(cashTransactions)
    .set({ ...parsed.data, description: parsed.data.description || null, ...receipt })
    .where(and(eq(cashTransactions.id, id), eq(cashTransactions.tenantId, tenant.id)))
    .returning({ id: cashTransactions.id });
  if (!updated.length) {
    await deleteImage(receipt.receiptUrl); // unggahan baru tidak terpakai
    return { error: "Transaksi tidak ditemukan." };
  }
  if (before?.receiptUrl && before.receiptUrl !== receipt.receiptUrl) await deleteImage(before.receiptUrl);

  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/admin/kas?bulan=${parsed.data.transactionDate.slice(0, 7)}`);
}

export async function deleteTransaction(slug: string, id: string) {
  const access = await requireTenantAccess(slug, [...KAS_ROLES]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return;
  const [removed] = await db
    .delete(cashTransactions)
    .where(and(eq(cashTransactions.id, id), eq(cashTransactions.tenantId, tenant.id)))
    .returning({ receiptUrl: cashTransactions.receiptUrl });
  await deleteImage(removed?.receiptUrl);
  revalidatePath(`/${slug}`, "layout");
}
