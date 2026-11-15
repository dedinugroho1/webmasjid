/**
 * Konfigurasi publik platform (operator, kontak, donasi, layanan "Terima Beres").
 * Semua opsional: bagian yang kontaknya belum diisi disembunyikan, sehingga
 * tidak ada teks placeholder atau tautan ke alamat yang belum tentu ada.
 */
type Env = Record<string, string | undefined>;

const clean = (v: string | undefined) => v?.trim() || undefined;

export type PlatformConfig = {
  /** Nama pengelola instance ini (untuk halaman privasi & syarat). */
  operatorName: string;
  /** Email kontak publik, bila ada. */
  contactEmail?: string;
  /** Nomor WhatsApp layanan, hanya digit (format internasional tanpa +). */
  whatsapp?: string;
  /** Tautan kontak layanan "Terima Beres": WhatsApp, email, atau tidak ada. */
  serviceHref?: string;
  qrisUrl?: string;
  donationNote: string;
};

export function platformConfig(env: Env = process.env): PlatformConfig {
  const contactEmail = clean(env.NEXT_PUBLIC_CONTACT_EMAIL);
  const whatsapp = clean(env.NEXT_PUBLIC_SERVICE_WHATSAPP)?.replace(/\D/g, "") || undefined;
  const message = encodeURIComponent("Assalamu'alaikum, saya ingin konsultasi jasa pasang WebMasjid.");
  return {
    operatorName: clean(env.NEXT_PUBLIC_OPERATOR_NAME) ?? "Pengelola WebMasjid",
    contactEmail,
    whatsapp,
    serviceHref: whatsapp
      ? `https://wa.me/${whatsapp}?text=${message}`
      : contactEmail
        ? `mailto:${contactEmail}?subject=${encodeURIComponent("Konsultasi jasa pasang WebMasjid")}`
        : undefined,
    qrisUrl: clean(env.NEXT_PUBLIC_PLATFORM_QRIS_URL),
    donationNote: clean(env.NEXT_PUBLIC_PLATFORM_DONATION_NOTE) ?? "Infaq untuk biaya server & pemeliharaan WebMasjid",
  };
}
