import { beforeAll, describe, expect, it } from "vitest";
import { isPlatformHost, normalizeDomain, validateCustomDomain } from "@/lib/domains";

beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://webmasjid.com";
  process.env.PLATFORM_HOSTS = "app.webmasjid.id";
});

describe("domains", () => {
  it("normalisasi input", () => {
    expect(normalizeDomain(" https://MasjidKu.or.id/profil?x=1 ")).toBe("masjidku.or.id");
    expect(normalizeDomain("masjid.id:443")).toBe("masjid.id");
  });

  it("mengenali host platform", () => {
    expect(isPlatformHost("webmasjid.com")).toBe(true);
    expect(isPlatformHost("www.webmasjid.com")).toBe(true);
    expect(isPlatformHost("app.webmasjid.id")).toBe(true);
    expect(isPlatformHost("webmasjid-git-main.vercel.app")).toBe(true);
    expect(isPlatformHost("localhost")).toBe(true);
    expect(isPlatformHost("masjidalikhlas.or.id")).toBe(false);
  });

  it.each([
    ["masjidalikhlas.or.id", true],
    ["https://www.masjid-annur.com/", true],
    ["", true],
    ["webmasjid.com", false],
    ["palsu.webmasjid.com", false],
    ["localhost", false],
    ["bukan domain", false],
    ["-awal.com", false],
  ])("validateCustomDomain(%s) ok=%s", (input, ok) => {
    expect(validateCustomDomain(input).ok).toBe(ok);
  });

  it("domain kosong berarti menghapus domain", () => {
    expect(validateCustomDomain("  ")).toEqual({ ok: true, domain: null });
  });
});
