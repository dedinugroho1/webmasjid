import "server-only";
import { adminNotifyRecipients, newRegistrationEmail, type NewRegistration } from "./admin-notify-core";
import { sendEmail } from "./email";
import { appUrl } from "./utils";

/**
 * Kabari pengelola platform tentang pendaftaran masjid baru.
 * Tidak pernah melempar error: kegagalan email tidak boleh menggagalkan pendaftaran.
 */
export async function notifyNewRegistration(r: NewRegistration) {
  const to = adminNotifyRecipients();
  if (!to.length) return;
  const { subject, text } = newRegistrationEmail(r, appUrl());
  await Promise.all(
    to.map((email) =>
      sendEmail({ to: email, subject, text }).catch((e) =>
        console.error("[admin-notify] gagal mengirim notifikasi pendaftaran:", (e as Error).message),
      ),
    ),
  );
}
