import { describe, expect, it } from "vitest";
import { platformConfig } from "@/lib/platform";

describe("platformConfig", () => {
  it("tanpa konfigurasi: tidak ada kontak, QRIS, atau tautan layanan", () => {
    const c = platformConfig({});
    expect(c.serviceHref).toBeUndefined();
    expect(c.qrisUrl).toBeUndefined();
    expect(c.contactEmail).toBeUndefined();
    expect(c.operatorName).toBe("Pengelola WebMasjid");
  });

  it("WhatsApp diutamakan dan dibersihkan menjadi digit", () => {
    const c = platformConfig({ NEXT_PUBLIC_SERVICE_WHATSAPP: "+62 812-3456-7890", NEXT_PUBLIC_CONTACT_EMAIL: "a@b.id" });
    expect(c.whatsapp).toBe("6281234567890");
    expect(c.serviceHref).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
  });

  it("tanpa WhatsApp memakai email; nilai kosong/spasi dianggap tidak ada", () => {
    expect(platformConfig({ NEXT_PUBLIC_CONTACT_EMAIL: "halo@masjid.id" }).serviceHref).toMatch(/^mailto:halo@masjid\.id\?subject=/);
    expect(platformConfig({ NEXT_PUBLIC_SERVICE_WHATSAPP: "  ", NEXT_PUBLIC_CONTACT_EMAIL: "" }).serviceHref).toBeUndefined();
    expect(platformConfig({ NEXT_PUBLIC_SERVICE_WHATSAPP: "tidak ada nomor" }).whatsapp).toBeUndefined();
  });

  it("nama operator & catatan donasi bisa diatur", () => {
    const c = platformConfig({ NEXT_PUBLIC_OPERATOR_NAME: "Yayasan Contoh", NEXT_PUBLIC_PLATFORM_DONATION_NOTE: "Untuk server" });
    expect(c.operatorName).toBe("Yayasan Contoh");
    expect(c.donationNote).toBe("Untuk server");
  });
});
