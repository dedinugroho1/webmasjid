import "server-only";
import { mailketingConfig, mailketingPayload, type EmailMessage } from "./email-core";

/**
 * Pengiriman email transaksional (reset password, notifikasi pendaftar baru).
 *
 * - Bila `MAILKETING_API_TOKEN` & `EMAIL_FROM` diset → dikirim via Mailketing
 *   (https://mailketing.co.id). Domain pengirim harus aktif di Mailketing.
 * - Bila tidak → isi email dicetak ke log server (cocok untuk development).
 *   Di produksi tanpa email, admin DKM tetap bisa mengatur ulang password
 *   pengurus dari menu Pengurus.
 */
export function emailEnabled() {
  return mailketingConfig() !== null;
}

export async function sendEmail(msg: EmailMessage) {
  const cfg = mailketingConfig();
  if (!cfg) {
    console.info(`[webmasjid:email] (email belum dikonfigurasi) → ${msg.to}\nSubjek: ${msg.subject}\n${msg.text}`);
    return;
  }
  let res: Response;
  try {
    res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(mailketingPayload(cfg, msg)),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    console.error("[webmasjid:email] Mailketing tidak bisa dihubungi:", (e as Error).message);
    throw new Error("Gagal mengirim email");
  }
  const body = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
  if (!res.ok || !body?.success) {
    console.error(`[webmasjid:email] Mailketing menolak email: HTTP ${res.status} ${body?.message ?? ""}`.trim());
    throw new Error("Gagal mengirim email");
  }
}
