import "server-only";

/**
 * Pengiriman email transaksional (reset password, dll.).
 *
 * - Bila `RESEND_API_KEY` & `EMAIL_FROM` diset → dikirim via Resend (https://resend.com).
 * - Bila tidak → isi email dicetak ke log server (cocok untuk development).
 *   Di produksi tanpa email, admin DKM tetap bisa mengatur ulang password
 *   pengurus dari menu Pengurus.
 */
export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  if (!emailEnabled()) {
    console.info(`[webmasjid:email] (email belum dikonfigurasi) → ${to}\nSubjek: ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text, html }),
  });
  if (!res.ok) {
    console.error("[webmasjid:email] gagal mengirim email", res.status, await res.text().catch(() => ""));
    throw new Error("Gagal mengirim email");
  }
}
