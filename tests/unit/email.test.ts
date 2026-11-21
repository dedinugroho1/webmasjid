import { describe, expect, it } from "vitest";
import { MAILKETING_ENDPOINT, mailketingConfig, mailketingPayload, parseFrom, textToHtml } from "@/lib/email-core";

describe("parseFrom", () => {
  it("membaca format nama <email>", () => {
    expect(parseFrom("WebMasjid <noreply@webmasjid.com>")).toEqual({ name: "WebMasjid", email: "noreply@webmasjid.com" });
    expect(parseFrom('"DKM Al-Ikhlas" <dkm@masjid.id>')).toEqual({ name: "DKM Al-Ikhlas", email: "dkm@masjid.id" });
  });
  it("email saja memakai nama bawaan", () => {
    expect(parseFrom("noreply@webmasjid.com")).toEqual({ name: "WebMasjid", email: "noreply@webmasjid.com" });
  });
  it("menolak nilai kosong atau tidak valid", () => {
    expect(parseFrom("")).toBeNull();
    expect(parseFrom(undefined)).toBeNull();
    expect(parseFrom("WebMasjid <bukan-email>")).toBeNull();
  });
});

describe("mailketingConfig", () => {
  it("null bila token atau pengirim belum ada", () => {
    expect(mailketingConfig({})).toBeNull();
    expect(mailketingConfig({ MAILKETING_API_TOKEN: "t" })).toBeNull();
    expect(mailketingConfig({ EMAIL_FROM: "a@b.id" })).toBeNull();
  });
  it("lengkap → endpoint v2 bawaan", () => {
    expect(mailketingConfig({ MAILKETING_API_TOKEN: " t ", EMAIL_FROM: "WM <a@b.id>" })).toEqual({
      token: "t",
      fromName: "WM",
      fromEmail: "a@b.id",
      endpoint: MAILKETING_ENDPOINT,
    });
  });
});

describe("textToHtml", () => {
  it("escape HTML, tautan bisa diklik, baris baru dipertahankan", () => {
    const html = textToHtml("Halo <b>Ahmad</b>,\nBuka: https://web.id/reset?token=a&b=1.");
    expect(html.startsWith("<html>")).toBe(true);
    expect(html).toContain("Halo &lt;b&gt;Ahmad&lt;/b&gt;,<br>");
    expect(html).toContain('<a href="https://web.id/reset?token=a&amp;b=1">https://web.id/reset?token=a&amp;b=1</a>.');
  });
});

describe("mailketingPayload", () => {
  const cfg = { token: "t", fromName: "WM", fromEmail: "a@b.id", endpoint: MAILKETING_ENDPOINT };
  it("teks biasa diubah menjadi HTML", () => {
    const p = mailketingPayload(cfg, { to: "x@y.id", subject: "S", text: "baris1\nbaris2" });
    expect(p).toMatchObject({ from_name: "WM", from_email: "a@b.id", recipient: "x@y.id", subject: "S" });
    expect(p.content).toContain("baris1<br>");
    expect(p.content).toMatch(/^<html>/);
  });
  it("HTML tanpa tag <html> dibungkus agar tidak dianggap teks biasa", () => {
    expect(mailketingPayload(cfg, { to: "x@y.id", subject: "S", text: "", html: "<p>Hai</p>" }).content).toBe(
      "<html><body><p>Hai</p></body></html>",
    );
  });
});
