import { describe, expect, it } from "vitest";
import { isValidSlug } from "@/lib/reserved-slugs";
import { parseBankAccounts, parsePrayerTuning } from "@/lib/settings-parse";
import { generateTempPassword, generateToken, hashToken } from "@/lib/tokens";
import { slugify } from "@/lib/utils";

describe("slug", () => {
  it("slugify", () => {
    expect(slugify("Masjid Al-Ikhlas")).toBe("masjid-al-ikhlas");
    expect(slugify("  Musholla Nūr  ")).toBe("musholla-nur");
  });

  it.each([
    ["al-ikhlas", true],
    ["an-nur-2", true],
    ["ab", false],
    ["-awal", false],
    ["akhir-", false],
    ["Huruf-Besar", false],
    ["admin", false],
    ["undangan", false],
    ["superadmin", false],
  ])("isValidSlug(%s) = %s", (slug, ok) => {
    expect(isValidSlug(slug)).toBe(ok);
  });
});

describe("parseBankAccounts", () => {
  it("membaca format Bank | Nomor | Atas Nama dan mengabaikan baris rusak", () => {
    expect(parseBankAccounts("BSI | 7123 | DKM Al-Ikhlas\nbaris rusak\n\nBRI|0123|Bendahara")).toEqual([
      { bank: "BSI", number: "7123", holder: "DKM Al-Ikhlas" },
      { bank: "BRI", number: "0123", holder: "Bendahara" },
    ]);
  });
});

describe("parsePrayerTuning", () => {
  const fd = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };

  it("menyimpan koreksi non-nol & iqomah semua waktu wajib", () => {
    const r = parsePrayerTuning(fd({ adj_subuh: "2", adj_isya: "0", iqomah_subuh: "15", iqomah_maghrib: "5" }));
    expect(r.errors).toEqual({});
    expect(r.adjustments).toEqual({ subuh: 2 });
    expect(r.iqomahMinutes).toMatchObject({ subuh: 15, maghrib: 5, dzuhur: 0 });
  });

  it("menolak nilai di luar batas atau desimal", () => {
    const r = parsePrayerTuning(fd({ adj_isya: "99", iqomah_subuh: "2.5" }));
    expect(Object.keys(r.errors).sort()).toEqual(["adj_isya", "iqomah_subuh"]);
  });
});

describe("tokens", () => {
  it("token acak, hash deterministik", () => {
    const a = generateToken();
    expect(a).not.toBe(generateToken());
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("password sementara mudah dibaca", () => {
    expect(generateTempPassword()).toMatch(/^[a-z]+-\d{4}-[a-z]+$/);
  });
});
