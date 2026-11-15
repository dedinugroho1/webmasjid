import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("memakai BOM, pemisah titik koma, dan CRLF", () => {
    expect(toCsv([["a", 1], ["b", 2]])).toBe("﻿a;1\r\nb;2\r\n");
  });

  it("meng-escape tanda kutip, titik koma, dan baris baru", () => {
    expect(toCsv([['Kata "kutip"', "a;b", "baris\nbaru"]])).toBe('﻿"Kata ""kutip""";"a;b";"baris\nbaru"\r\n');
  });

  it("mencegah formula injection, angka negatif tetap angka", () => {
    expect(toCsv([["=HYPERLINK(1)", "-tes", -5000, null]])).toBe("﻿'=HYPERLINK(1);'-tes;-5000;\r\n");
  });
});
