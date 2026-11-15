/**
 * Pemeriksaan ringan anti-spam untuk pendaftaran (tanpa layanan pihak ketiga):
 * - email sekali pakai,
 * - teks berisi tautan/spam di kolom nama,
 * - token waktu bertanda tangan: form yang dikirim terlalu cepat = bot.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Domain email sekali pakai yang umum dipakai untuk spam. */
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonbox.net", "burnermail.io",
  "byom.de", "discard.email", "dispostable.com", "emailondeck.com", "fakeinbox.com", "fakemail.net",
  "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
  "guerrillamail.info", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com",
  "inboxbear.com", "incognitomail.org", "jetable.org", "maildrop.cc", "mailcatch.com", "mailinator.com",
  "mailinator.net", "mailnesia.com", "mailpoof.com", "mintemail.com", "mohmal.com", "moakt.com",
  "mytemp.email", "nada.email", "sharklasers.com", "spam4.me", "spamgourmet.com", "temp-mail.io",
  "temp-mail.org", "tempail.com", "tempmail.com", "tempmail.dev", "tempmail.net", "tempmailo.com",
  "tempr.email", "throwawaymail.com", "trashmail.com", "trashmail.de", "trashmail.net", "yopmail.com",
  "yopmail.fr", "yopmail.net",
]);

export function isDisposableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return false;
  // Cocokkan domain dan semua domain induknya (mis. abc.mailinator.com).
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

/** Nama yang berisi tautan, email, atau pola spam — bukan nama masjid/orang yang wajar. */
export function looksLikeSpamText(text: string) {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/https?:\/\/|www\.|\.(com|net|org|xyz|top|info|site|online|shop|id|co)\b/.test(t)) return true;
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/.test(t)) return true;
  if (/(.)\1{5,}/.test(t)) return true; // huruf/simbol sama berulang 6x+
  if (!/\p{L}/u.test(t)) return true; // tanpa huruf sama sekali
  if (/\b(slot|gacor|judi|togel|casino|poker|bokep|porn|viagra|pinjol)\b/.test(t)) return true;
  return false;
}

/** Waktu minimal (detik) antara form dibuka dan dikirim. */
export const MIN_FILL_SECONDS = 3;
const MAX_AGE_SECONDS = 24 * 60 * 60;

function secret() {
  return process.env.BETTER_AUTH_SECRET || "webmasjid-dev-secret";
}

function sign(issuedAt: number) {
  return createHmac("sha256", secret()).update(`form:${issuedAt}`).digest("base64url");
}

/** Token berisi waktu form dibuat + tanda tangan HMAC (tidak bisa dipalsukan bot). */
export function createFormToken(now = Date.now()) {
  return `${now}.${sign(now)}`;
}

export type FormTokenCheck = { ok: true } | { ok: false; reason: "invalid" | "too-fast" | "expired" };

export function verifyFormToken(token: unknown, now = Date.now()): FormTokenCheck {
  if (typeof token !== "string") return { ok: false, reason: "invalid" };
  const [ts, sig] = token.split(".");
  const issuedAt = Number(ts);
  if (!Number.isFinite(issuedAt) || !sig) return { ok: false, reason: "invalid" };
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };
  const age = (now - issuedAt) / 1000;
  if (age < MIN_FILL_SECONDS) return { ok: false, reason: "too-fast" };
  if (age > MAX_AGE_SECONDS) return { ok: false, reason: "expired" };
  return { ok: true };
}
