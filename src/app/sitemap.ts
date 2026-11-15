import type { MetadataRoute } from "next";
import { listPublishedTenants } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Landing + halaman publik setiap masjid yang tampil di direktori. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const masjids = await listPublishedTenants(5000).catch(() => []);
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/daftar`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privasi`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/syarat`, changeFrequency: "yearly", priority: 0.2 },
    ...masjids.map((m) => ({ url: `${base}/${m.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
