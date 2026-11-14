"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cashTransactions } from "@/db/schema";
import { requireTenantAccess } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

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

export async function createTransaction(slug: string, _prev: KasFormState, formData: FormData): Promise<KasFormState> {
  const { tenant, user } = await requireTenantAccess(slug, [...KAS_ROLES]);

  const parsed = txSchema.safeParse({
    type: formData.get("type"),
    fund: formData.get("fund"),
    category: formData.get("category"),
    amount: formData.get("amount") ?? "",
    description: formData.get("description") || undefined,
    transactionDate: formData.get("transactionDate"),
  });
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

export async function deleteTransaction(slug: string, id: string) {
  const { tenant } = await requireTenantAccess(slug, [...KAS_ROLES]);
  await db.delete(cashTransactions).where(and(eq(cashTransactions.id, id), eq(cashTransactions.tenantId, tenant.id)));
  revalidatePath(`/${slug}`, "layout");
}
