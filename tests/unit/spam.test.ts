import { describe, expect, it } from "vitest";
import { createFormToken, isDisposableEmail, looksLikeSpamText, MIN_FILL_SECONDS, verifyFormToken } from "@/lib/spam";

describe("isDisposableEmail", () => {
  it.each([
    ["orang@mailinator.com", true],
    ["x@sub.yopmail.com", true],
    ["Dkm@Tempmail.com", true],
    ["dkm.alikhlas@gmail.com", false],
    ["bendahara@masjid-annur.or.id", false],
  ])("%s → %s", (email, expected) => {
    expect(isDisposableEmail(email)).toBe(expected);
  });
});

describe("looksLikeSpamText", () => {
  it.each([
    "Masjid Al-Ikhlas",
    "Masjid Jami' Nurul Huda",
    "Musholla Baitur Rahman RT 05",
    "Ust. H. Ahmad Fauzi, Lc.",
    "Masjid Raya Al-Azhar (Kel. Sukamaju)",
  ])("nama wajar lolos: %s", (name) => {
    expect(looksLikeSpamText(name)).toBe(false);
  });

  it.each([
    "Promo www.contoh.xyz",
    "https://spam.example",
    "Masjid situsjudi.com",
    "admin@spam.net",
    "aaaaaaaaaa",
    "12345",
    "Slot Gacor Hari Ini",
  ])("spam ditolak: %s", (name) => {
    expect(looksLikeSpamText(name)).toBe(true);
  });
});

describe("token waktu form", () => {
  const t0 = 1_800_000_000_000;

  it("lolos bila dikirim setelah waktu minimal", () => {
    expect(verifyFormToken(createFormToken(t0), t0 + (MIN_FILL_SECONDS + 1) * 1000)).toEqual({ ok: true });
  });

  it("ditolak bila terlalu cepat atau kedaluwarsa", () => {
    expect(verifyFormToken(createFormToken(t0), t0 + 500)).toEqual({ ok: false, reason: "too-fast" });
    expect(verifyFormToken(createFormToken(t0), t0 + 25 * 3600 * 1000)).toEqual({ ok: false, reason: "expired" });
  });

  it("ditolak bila dipalsukan", () => {
    const [, sig] = createFormToken(t0).split(".");
    expect(verifyFormToken(`${t0 - 60_000}.${sig}`, t0)).toEqual({ ok: false, reason: "invalid" });
    expect(verifyFormToken("abc", t0)).toEqual({ ok: false, reason: "invalid" });
    expect(verifyFormToken(undefined, t0)).toEqual({ ok: false, reason: "invalid" });
  });
});
