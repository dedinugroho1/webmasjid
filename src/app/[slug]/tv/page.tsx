import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TvDisplay } from "@/components/masjid/tv-display";
import { DEFAULT_RUNNING_TEXT } from "@/lib/constants";
import { getPrayerConfig, getTenantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  return { title: tenant ? `TV Display · ${tenant.name}` : "TV Display", robots: { index: false } };
}

/** Halaman layar TV masjid: buka di browser Smart TV / Android TV, tekan fullscreen. */
export default async function TvPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const config = await getPrayerConfig(tenant);

  return (
    <TvDisplay
      name={tenant.name}
      address={[tenant.address, tenant.city].filter(Boolean).join(", ") || null}
      logoUrl={tenant.logoUrl}
      runningText={tenant.runningText || DEFAULT_RUNNING_TEXT}
      config={config}
    />
  );
}
