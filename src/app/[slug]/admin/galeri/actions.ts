"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { galleryItems } from "@/db/schema";
import { DEMO_READONLY_MESSAGE, isReadOnlyDemo } from "@/lib/demo";
import { requireTenantAccess } from "@/lib/session";
import { deleteImage, uploadImage } from "@/lib/storage";

export type GalleryState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

const schema = z.object({
  caption: z.string().trim().max(200).optional(),
  takenAt: z.iso.date("Tanggal tidak valid").optional(),
});

export async function addGalleryItem(slug: string, _prev: GalleryState, formData: FormData): Promise<GalleryState> {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant, user } = access;
  if (isReadOnlyDemo(access)) return { error: DEMO_READONLY_MESSAGE };
  const parsed = schema.safeParse({
    caption: formData.get("caption") || undefined,
    takenAt: formData.get("takenAt") || undefined,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let imageUrl: string | null;
  try {
    imageUrl = await uploadImage(formData.get("image"), `${tenant.id}/gallery`);
  } catch (e) {
    return { fieldErrors: { image: [(e as Error).message] } };
  }
  if (!imageUrl) return { fieldErrors: { image: ["Pilih foto terlebih dahulu"] } };

  await db.insert(galleryItems).values({
    tenantId: tenant.id,
    imageUrl,
    caption: parsed.data.caption ?? null,
    takenAt: parsed.data.takenAt ?? null,
    createdBy: user.id,
  });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true };
}

export async function deleteGalleryItem(slug: string, id: string) {
  const access = await requireTenantAccess(slug, ["DKM_ADMIN"]);
  const { tenant } = access;
  if (isReadOnlyDemo(access)) return;
  const [removed] = await db
    .delete(galleryItems)
    .where(and(eq(galleryItems.id, id), eq(galleryItems.tenantId, tenant.id)))
    .returning({ imageUrl: galleryItems.imageUrl });
  await deleteImage(removed?.imageUrl);
  revalidatePath(`/${slug}`, "layout");
}
