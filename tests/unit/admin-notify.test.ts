import { describe, expect, it } from "vitest";
import { adminNotifyRecipients, newRegistrationEmail } from "@/lib/admin-notify-core";

describe("adminNotifyRecipients", () => {
  it("kosong bila tidak diset", () => {
    expect(adminNotifyRecipients({})).toEqual([]);
  });
  it("memisah koma, membuang duplikat dan nilai tidak valid", () => {
    expect(adminNotifyRecipients({ ADMIN_NOTIFY_EMAIL: " A@x.id, b@y.org ; a@x.id, bukan-email" })).toEqual([
      "a@x.id",
      "b@y.org",
    ]);
  });
});

describe("newRegistrationEmail", () => {
  const reg = {
    masjidName: "Masjid Al-Falah",
    slug: "al-falah",
    city: "Bandung",
    adminName: "Ahmad",
    adminEmail: "ahmad@masjid.id",
    needsApproval: true,
  };
  it("menautkan antrean persetujuan bila moderasi aktif", () => {
    const { subject, text } = newRegistrationEmail(reg, "https://web.id/");
    expect(subject).toContain("Menunggu persetujuan");
    expect(text).toContain("https://web.id/al-falah");
    expect(text).toContain("https://web.id/superadmin?q=al-falah&status=menunggu");
    expect(text).toContain("Ahmad <ahmad@masjid.id>");
  });
  it("tanpa moderasi hanya memberi tahu", () => {
    const { subject, text } = newRegistrationEmail({ ...reg, needsApproval: false }, "https://web.id");
    expect(subject).toContain("Masjid baru terdaftar");
    expect(text).toContain("https://web.id/superadmin?q=al-falah\n");
  });
});
