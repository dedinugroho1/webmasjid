import { describe, expect, it } from "vitest";
import {
  PLATFORM_ACTION_LABELS,
  actionGroup,
  actionsInGroup,
  maskEmail,
  parsePlatformGroup,
  userLabel,
} from "@/lib/platform-audit-core";

describe("maskEmail", () => {
  it("menyamarkan bagian lokal email", () => {
    expect(maskEmail("ahmad.fauzi@gmail.com")).toBe("ah***@gmail.com");
    expect(maskEmail("ab@x.id")).toBe("a***@x.id");
    expect(maskEmail("a@x.id")).toBe("a***@x.id");
  });
  it("mengabaikan nilai kosong dan bukan email", () => {
    expect(maskEmail("")).toBeNull();
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail("bukan-email")).toBe("bukan-email");
  });
});

describe("userLabel", () => {
  it("menggabungkan nama dan email tersamar", () => {
    expect(userLabel({ name: "Ahmad", email: "ahmad@masjid.id" })).toBe("Ahmad (ah***@masjid.id)");
  });
});

describe("kelompok aksi", () => {
  it("mengelompokkan setiap aksi", () => {
    expect(actionGroup("TENANT_DELETE")).toBe("tenant");
    expect(actionGroup("USER_ROLE")).toBe("user");
    expect(actionGroup("SETTING_MODERATION")).toBe("setting");
  });
  it("setiap aksi masuk tepat satu kelompok", () => {
    const all = [...actionsInGroup("tenant"), ...actionsInGroup("user"), ...actionsInGroup("setting")];
    expect(all.sort()).toEqual(Object.keys(PLATFORM_ACTION_LABELS).sort());
  });
  it("hanya menerima kelompok yang dikenal", () => {
    expect(parsePlatformGroup("user")).toBe("user");
    expect(parsePlatformGroup("lain")).toBeNull();
    expect(parsePlatformGroup(undefined)).toBeNull();
  });
});
