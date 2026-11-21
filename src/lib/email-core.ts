/**
 * Logika murni pengiriman email via Mailketing (https://mailketing.co.id),
 * API v2: POST JSON ke /api/v2/send, satu penerima per request, dan konten
 * dianggap HTML hanya bila memuat tag <html>.
 */
type Env = Record<string, string | undefined>;

export const MAILKETING_ENDPOINT = "https://api.mailketing.co.id/api/v2/send";

export type MailketingConfig = { token: string; fromName: string; fromEmail: string; endpoint: string };

/**
 * `EMAIL_FROM` boleh berupa "Nama <email@domain>" atau "email@domain".
 * Domain pengirim harus sudah aktif di Mailketing (Pengaturan → Sender & Domain).
 */
export function parseFrom(value: string | undefined): { name: string; email: string } | null {
  const raw = value?.trim();
  if (!raw) return null;
  const m = raw.match(/^(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>$/);
  const email = (m ? m[2] : raw).trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  const name = (m ? m[1] : "").trim().replace(/^"(.*)"$/, "$1") || "WebMasjid";
  return { name, email };
}

/** Konfigurasi Mailketing dari environment, atau `null` bila belum lengkap. */
export function mailketingConfig(env: Env = process.env): MailketingConfig | null {
  const token = env.MAILKETING_API_TOKEN?.trim();
  const from = parseFrom(env.EMAIL_FROM);
  if (!token || !from) return null;
  return {
    token,
    fromName: from.name,
    fromEmail: from.email,
    endpoint: env.MAILKETING_ENDPOINT?.trim() || MAILKETING_ENDPOINT,
  };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Teks biasa → HTML sederhana: aman di-escape, tautan bisa diklik, baris baru dipertahankan. */
export function textToHtml(text: string): string {
  const body = escapeHtml(text)
    .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => `<a href="${url}">${url}</a>`)
    .replace(/\r?\n/g, "<br>\n");
  return `<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">${body}</body></html>`;
}

export type EmailMessage = { to: string; subject: string; text: string; html?: string };

export function mailketingPayload(cfg: MailketingConfig, msg: EmailMessage) {
  const html = msg.html?.trim();
  return {
    from_name: cfg.fromName,
    from_email: cfg.fromEmail,
    recipient: msg.to,
    subject: msg.subject,
    content: html ? (/<html[\s>]/i.test(html) ? html : `<html><body>${html}</body></html>`) : textToHtml(msg.text),
  };
}
