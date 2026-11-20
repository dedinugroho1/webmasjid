/**
 * Logika murni notifikasi pengelola platform: siapa penerimanya dan isi email
 * pemberitahuan pendaftaran masjid baru.
 */
type Env = Record<string, string | undefined>;

/** `ADMIN_NOTIFY_EMAIL` (boleh beberapa, dipisah koma) → daftar email unik yang valid. */
export function adminNotifyRecipients(env: Env = process.env): string[] {
  const raw = env.ADMIN_NOTIFY_EMAIL ?? "";
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) seen.add(email);
  }
  return [...seen];
}

export type NewRegistration = {
  masjidName: string;
  slug: string;
  city: string;
  adminName: string;
  adminEmail: string;
  needsApproval: boolean;
};

export function newRegistrationEmail(r: NewRegistration, baseUrl: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const review = `${base}/superadmin?${new URLSearchParams({ q: r.slug, ...(r.needsApproval ? { status: "menunggu" } : {}) })}`;
  const subject = r.needsApproval
    ? `[WebMasjid] Menunggu persetujuan: ${r.masjidName}`
    : `[WebMasjid] Masjid baru terdaftar: ${r.masjidName}`;
  const text = [
    "Assalamu'alaikum,",
    "",
    r.needsApproval
      ? "Ada pendaftaran masjid baru yang menunggu persetujuan Anda."
      : "Ada masjid baru yang mendaftar di WebMasjid.",
    "",
    `Masjid  : ${r.masjidName}`,
    `Alamat  : ${base}/${r.slug}`,
    `Kota    : ${r.city}`,
    `Admin   : ${r.adminName} <${r.adminEmail}>`,
    "",
    `${r.needsApproval ? "Tinjau dan setujui" : "Lihat"} di panel superadmin: ${review}`,
    "",
    "Email ini dikirim otomatis karena alamat Anda tercantum di ADMIN_NOTIFY_EMAIL.",
  ].join("\n");
  return { subject, text };
}
