import { OG_SIZE, ogImage } from "@/lib/og-image";
import { getPublicTenantBySlug } from "@/lib/tenant";

export const alt = "Website masjid di WebMasjid";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Gambar pratinjau saat link masjid dibagikan ke WhatsApp/media sosial. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getPublicTenantBySlug(slug).catch(() => null);
  if (!tenant) return ogImage({ title: "WebMasjid", subtitle: "Website masjid gratis & transparan", footer: "webmasjid" });
  return ogImage({
    title: tenant.name,
    subtitle: [tenant.address, tenant.city].filter(Boolean).join(", ") || null,
    footer: "Jadwal sholat · Petugas Jumat · Kajian rutin · Laporan kas",
  });
}
