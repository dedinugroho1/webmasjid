"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jumatSchedules } from "@/db/schema";
import { isFridayISO } from "@/lib/jumat";
import { requireTenantAccess } from "@/lib/session";

export type JumatState = { ok?: boolean; error?: string; savedAt?: number } | null;

const text = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => v || null);

const schema = z.object({ khatib: text, imam: text, muadzin: text, theme: text });

/** Simpan petugas satu Jumat (upsert). Semua kolom kosong → baris dihapus. */
export async function saveJumat(slug: string, date: string, _prev: JumatState, formData: FormData): Promise<JumatState> {
  const { tenant } = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  if (!isFridayISO(date)) return { error: "Tanggal bukan hari Jumat." };
  const parsed = schema.safeParse({
    khatib: formData.get("khatib") ?? undefined,
    imam: formData.get("imam") ?? undefined,
    muadzin: formData.get("muadzin") ?? undefined,
    theme: formData.get("theme") ?? undefined,
  });
  if (!parsed.success) return { error: "Isian terlalu panjang (maks. 120 karakter)." };
  const d = parsed.data;

  if (!d.khatib && !d.imam && !d.muadzin && !d.theme) {
    await db.delete(jumatSchedules).where(and(eq(jumatSchedules.tenantId, tenant.id), eq(jumatSchedules.date, date)));
  } else {
    await db
      .insert(jumatSchedules)
      .values({ tenantId: tenant.id, date, ...d })
      .onConflictDoUpdate({ target: [jumatSchedules.tenantId, jumatSchedules.date], set: d });
  }
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, savedAt: Date.now() };
}
