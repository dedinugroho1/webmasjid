"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { localInputToDate } from "@/lib/format";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";

export type EventFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const eventSchema = z.object({
  type: z.enum(["KAJIAN", "JUMAT", "SOSIAL"]),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(150),
  speaker: z.string().trim().max(100).optional(),
  imam: z.string().trim().max(100).optional(),
  location: z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Tanggal & jam wajib diisi"),
});

export async function createEvent(slug: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { dateTime, ...rest } = parsed.data;
  await db.insert(events).values({
    ...rest,
    tenantId: tenant.id,
    dateTime: localInputToDate(dateTime, tenant.timezone),
  });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export async function updateEvent(slug: string, id: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { dateTime, ...rest } = parsed.data;
  const updated = await db
    .update(events)
    .set({
      // Kolom opsional yang dikosongkan harus menjadi null, bukan dibiarkan.
      speaker: null,
      imam: null,
      location: null,
      description: null,
      ...rest,
      dateTime: localInputToDate(dateTime, tenant.timezone),
    })
    .where(and(eq(events.id, id), eq(events.tenantId, tenant.id)))
    .returning({ id: events.id });
  if (!updated.length) return { error: "Agenda tidak ditemukan." };

  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/admin/agenda`);
}

export async function deleteEvent(slug: string, id: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return;
  await db.delete(events).where(and(eq(events.id, id), eq(events.tenantId, tenant.id)));
  revalidatePath(`/${slug}`, "layout");
}
