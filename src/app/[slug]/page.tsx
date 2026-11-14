import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, HandCoins, Images, Landmark, Mail, MapPin, Megaphone, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementList } from "@/components/masjid/announcement-list";
import { BankAccounts } from "@/components/masjid/bank-accounts";
import { CashSummary } from "@/components/masjid/cash-summary";
import { EventList } from "@/components/masjid/event-list";
import { GalleryGrid } from "@/components/masjid/gallery-grid";
import { PrayerWidget } from "@/components/masjid/prayer-widget";
import { QrisCard } from "@/components/masjid/qris-card";
import { getBalances, listTransactions } from "@/lib/finance";
import { getActiveAnnouncements, getGallery, getPrayerConfig, getPublicTenantBySlug, getUpcomingEvents } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";

// Data kas & agenda selalu segar; halaman dirender per permintaan.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getPublicTenantBySlug(slug);
  if (!tenant) return { title: "Masjid tidak ditemukan" };
  return {
    title: tenant.name,
    description:
      tenant.description ??
      `Jadwal sholat, agenda kajian, laporan kas transparan, dan infaq digital ${tenant.name}${tenant.city ? `, ${tenant.city}` : ""}.`,
    openGraph: { images: tenant.coverUrl && !tenant.coverUrl.startsWith("data:") ? [tenant.coverUrl] : undefined },
  };
}

export default async function MasjidPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getPublicTenantBySlug(slug);
  if (!tenant) notFound();

  const [prayerConfig, balances, recent, upcoming, news, gallery] = await Promise.all([
    getPrayerConfig(tenant),
    getBalances(tenant.id),
    listTransactions(tenant.id, { limit: 10 }),
    getUpcomingEvents(tenant.id, 8),
    getActiveAnnouncements(tenant.id, 5),
    getGallery(tenant.id, 12),
  ]);

  return (
    <div className="min-h-dvh">
      {/* Header & Profil */}
      <header className="relative overflow-hidden border-b">
        {tenant.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.coverUrl} alt="" className="absolute inset-0 size-full object-cover opacity-25" />
        ) : (
          <div className="bg-pattern absolute inset-0" />
        )}
        <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={`Logo ${tenant.name}`} className="size-20 rounded-xl border bg-white object-contain p-1" />
          ) : (
            <div className="bg-primary text-primary-foreground grid size-20 place-items-center rounded-xl">
              <Landmark className="size-10" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
            {tenant.description && <p className="text-muted-foreground mt-1 max-w-2xl">{tenant.description}</p>}
            <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {(tenant.address || tenant.city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" /> {[tenant.address, tenant.city].filter(Boolean).join(", ")}
                </span>
              )}
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-1 hover:underline">
                  <Phone className="size-4" /> {tenant.phone}
                </a>
              )}
              {tenant.email && (
                <a href={`mailto:${tenant.email}`} className="flex items-center gap-1 hover:underline">
                  <Mail className="size-4" /> {tenant.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-8">
        {news.length > 0 && (
          <section aria-labelledby="pengumuman" className="grid gap-4">
            <SectionTitle id="pengumuman" icon={<Megaphone />} title="Pengumuman" />
            <AnnouncementList items={news} timeZone={tenant.timezone} />
          </section>
        )}

        <section aria-labelledby="jadwal">
          <h2 id="jadwal" className="sr-only">
            Jadwal Sholat
          </h2>
          <PrayerWidget config={prayerConfig} />
          <p className="text-muted-foreground mt-2 text-xs">
            Jadwal dihitung otomatis untuk koordinat masjid ({prayerConfig.latitude.toFixed(4)},{" "}
            {prayerConfig.longitude.toFixed(4)}), disesuaikan oleh pengurus DKM.
          </p>
        </section>

        <section aria-labelledby="kas" className="grid gap-4">
          <SectionTitle id="kas" icon={<HandCoins />} title="Transparansi Kas Masjid" />
          <CashSummary balances={balances} recent={recent} />
        </section>

        <div className="grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="infaq" className="grid content-start gap-4">
            <SectionTitle id="infaq" icon={<HandCoins />} title="Infaq Digital" />
            <Card>
              <CardHeader>
                <CardTitle>Salurkan Infaq & Sedekah</CardTitle>
                <CardDescription>Scan QRIS dari aplikasi bank / e-wallet apa pun, atau transfer ke rekening resmi DKM.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                {tenant.qrisUrl ? (
                  <QrisCard src={tenant.qrisUrl} name={tenant.name} />
                ) : (
                  <p className="text-muted-foreground text-sm">QRIS belum diunggah oleh pengurus.</p>
                )}
                <BankAccounts accounts={tenant.bankAccounts} />
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="agenda" className="grid content-start gap-4">
            <SectionTitle id="agenda" icon={<CalendarDays />} title="Agenda & Kajian" />
            <EventList events={upcoming} timeZone={tenant.timezone} />
          </section>
        </div>

        {gallery.length > 0 && (
          <section aria-labelledby="galeri" className="grid gap-4">
            <SectionTitle id="galeri" icon={<Images />} title="Galeri Kegiatan" />
            <GalleryGrid items={gallery.map(({ id, imageUrl, caption, takenAt }) => ({ id, imageUrl, caption, takenAt }))} />
          </section>
        )}
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        Website ini dibuat dengan{" "}
        <a href={appUrl()} className="text-primary font-medium hover:underline">
          WebMasjid
        </a>{" "}
        — platform open-source amal jariyah digital.
      </footer>
    </div>
  );
}

function SectionTitle({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-xl font-bold [&_svg]:text-primary [&_svg]:size-5">
      {icon} {title}
    </h2>
  );
}
