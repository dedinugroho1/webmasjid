import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CalendarClock,
  CalendarDays,
  Mic,
  Printer,
  CodeXml,
  HandHeart,
  Landmark,
  MapPin,
  QrCode,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/landing/site-header";
import { listPublishedTenants } from "@/lib/tenant";
import { platformConfig } from "@/lib/platform";
import { githubUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: BookOpenText,
    title: "Buku Kas & Infaq Jumat",
    desc: "Catat infaq Jumat, kotak amal, dan pengeluaran dari HP. Laporan kas Jumat siap dibacakan sebelum khutbah & dikirim ke grup WhatsApp.",
  },
  {
    icon: Mic,
    title: "Petugas Jumat & Kajian Rutin",
    desc: "Jadwal khatib, imam, muadzin, dan pengajian mingguan — diisi sekali, langsung tampil untuk jamaah.",
  },
  {
    icon: CalendarClock,
    title: "Jadwal Sholat Otomatis",
    desc: "Sesuai lokasi masjid (kriteria Kemenag), bisa dikoreksi per menit agar sama dengan jadwal setempat.",
  },
  {
    icon: Printer,
    title: "Cetak Papan Pengumuman",
    desc: "Satu klik mencetak jadwal Jumat, kajian, jadwal sholat sebulan, dan saldo kas — siap ditempel di masjid.",
  },
];

async function getDirectory() {
  try {
    return await listPublishedTenants(24);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const masjids = await getDirectory();
  const platform = platformConfig();

  return (
    <>
      <SiteHeader showServices={Boolean(platform.serviceHref)} showDonation={Boolean(platform.qrisUrl)} />
      <main>
        {/* Hero */}
        <section className="bg-pattern relative overflow-hidden border-b">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 text-center md:py-28">
            <p className="border-primary/30 bg-primary/5 text-primary mx-auto rounded-full border px-3 py-1 text-xs font-semibold">
              Open-source · Gratis · Amal Jariyah Digital
            </p>
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-balance md:text-6xl">
              Website masjid yang <span className="text-primary">sederhana, transparan</span>, dan langsung terpakai
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg text-balance">
              Untuk masjid di desa maupun kota: catat kas & infaq Jumat dari HP, umumkan petugas Jumat dan kajian rutin,
              tampilkan jadwal sholat — gratis di <b>webmasjid.com/nama-masjid</b>, atau host mandiri dari GitHub.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="outline">
                <Link href="/al-ikhlas">
                  Lihat Website Demo <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/masuk?demo=1">Coba Dashboard Demo</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/daftar">
                  <Landmark /> Daftarkan Masjid
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Fitur */}
        <section id="fitur" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20">
          <SectionHeading eyebrow="Fitur Utama" title="Semua yang dibutuhkan pengurus & jamaah" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="gap-3">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 grid size-11 place-items-center rounded-lg">
                    <Icon className="size-6" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">{desc}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Direktori */}
        <section id="direktori" className="bg-muted/40 scroll-mt-16 border-y">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <SectionHeading eyebrow="Direktori" title="Masjid yang sudah bergabung" />
            {masjids.length === 0 ? (
              <p className="text-muted-foreground mt-8 text-center">
                Belum ada masjid terdaftar. Jadilah yang pertama —{" "}
                <Link href="/daftar" className="text-primary underline">
                  daftarkan masjid Anda
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {masjids.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/${m.slug}`}
                      className="bg-card hover:border-primary flex items-center gap-3 rounded-lg border p-4 transition"
                    >
                      {m.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.logoUrl} alt="" className="size-11 rounded-md border bg-white object-contain" />
                      ) : (
                        <div className="bg-primary/10 text-primary grid size-11 place-items-center rounded-md">
                          <Landmark className="size-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{m.name}</p>
                        <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                          <MapPin className="size-3" /> {m.city ?? "—"} · /{m.slug}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Open Source */}
        <section id="open-source" className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-4 py-20 lg:grid-cols-2">
          <div className="grid content-start gap-4">
            <SectionHeading eyebrow="Open Source & Self-Host" title="Kode terbuka, gratis di-host sendiri" align="left" />
            <p className="text-muted-foreground">
              Seluruh kode WebMasjid berlisensi MIT. Pengurus yang memahami coding dapat meng-clone repositori dan
              men-deploy ke Vercel + Neon Postgres dengan paket gratis — lengkap dengan domain sendiri.
            </p>
            <ul className="grid gap-2 text-sm">
              {[
                [CodeXml, "Next.js App Router, Drizzle ORM, Better Auth, Tailwind + shadcn/ui"],
                [Server, "Serverless-ready: Neon Postgres dengan connection pooling"],
                [ShieldCheck, "Multi-tenant aman: setiap sesi admin terikat ke masjidnya"],
              ].map(([Icon, text]) => {
                const I = Icon as typeof CodeXml;
                return (
                  <li key={text as string} className="flex items-start gap-2">
                    <I className="text-primary mt-0.5 size-4 shrink-0" /> {text as string}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={githubUrl()} target="_blank" rel="noreferrer">
                  <CodeXml /> Lihat di GitHub
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`${githubUrl()}/blob/main/docs/SELF-HOSTING.md`} target="_blank" rel="noreferrer">
                  Panduan Self-Host
                </a>
              </Button>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm leading-relaxed text-slate-100">
            <code>{`# 1. Clone repositori
git clone ${githubUrl()}.git
cd webmasjid && npm install

# 2. Isi DATABASE_URL (Neon) & BETTER_AUTH_SECRET
cp .env.example .env

# 3. Buat tabel & data demo
npm run db:migrate
npm run db:seed

# 4. Jalankan
npm run dev   # → http://localhost:3000`}</code>
          </pre>
        </section>

        {/* Jasa Terima Beres */}
        {platform.serviceHref && (
          <section id="jasa" className="bg-primary text-primary-foreground scroll-mt-16">
            <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-[1fr_auto]">
              <div className="grid gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold opacity-80">
                  <Wrench className="size-4" /> Jasa Pasang “Terima Beres”
                </p>
                <h2 className="text-3xl font-bold">Pengurus DKM tidak paham teknis? Kami bantu.</h2>
                <p className="max-w-2xl opacity-90">
                  Instalasi server mandiri, pemasangan domain sendiri (mis. masjidalikhlas.or.id), migrasi data kas lama,
                  hingga pelatihan pengurus. Biaya terjangkau, hasilnya untuk kemaslahatan jamaah.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary">
                <a href={platform.serviceHref} target="_blank" rel="noreferrer">
                  Konsultasi Gratis <ArrowRight />
                </a>
              </Button>
            </div>
          </section>
        )}

        {/* Donasi */}
        {platform.qrisUrl && (
          <section id="donasi" className="mx-auto max-w-4xl scroll-mt-16 px-4 py-20">
            <Card className="md:flex-row md:items-center">
              <CardHeader className="flex-1">
                <div className="bg-primary/10 text-primary mb-2 grid size-11 place-items-center rounded-lg">
                  <HandHeart className="size-6" />
                </div>
                <CardTitle className="text-2xl">Dukung WebMasjid tetap gratis</CardTitle>
                <CardDescription className="text-base">
                  {platform.donationNote}.
                  Seluruh dana dipakai untuk sewa server, database, domain, dan pengembangan fitur — dilaporkan terbuka.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={platform.qrisUrl} alt="QRIS donasi WebMasjid" className="size-48 rounded-lg border bg-white object-contain p-2" />
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <footer className="text-muted-foreground border-t py-8 text-center text-sm">
        <p>
          © {new Date().getFullYear()} WebMasjid — proyek open-source berlisensi MIT.{" "}
          <a href={githubUrl()} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Kontribusi di GitHub
          </a>
        </p>
      </footer>
    </>
  );
}

function SectionHeading({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}
