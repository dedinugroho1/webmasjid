import { describe, expect, it } from "vitest";
import { resolvePlatformSettings } from "@/lib/platform-settings-core";

describe("resolvePlatformSettings", () => {
  it("tanpa data di database memakai default environment; moderasi mati", () => {
    expect(resolvePlatformSettings([], { registrationOpen: true })).toEqual({ registrationOpen: true, moderationEnabled: false });
    expect(resolvePlatformSettings([], { registrationOpen: false })).toEqual({ registrationOpen: false, moderationEnabled: false });
  });

  it("nilai di database mengalahkan environment", () => {
    const rows = [
      { key: "registration_open", value: true },
      { key: "moderation_enabled", value: true },
    ];
    expect(resolvePlatformSettings(rows, { registrationOpen: false })).toEqual({ registrationOpen: true, moderationEnabled: true });
  });

  it("nilai yang bukan boolean diabaikan", () => {
    const rows = [
      { key: "registration_open", value: "ya" },
      { key: "moderation_enabled", value: 1 },
      { key: "lainnya", value: true },
    ];
    expect(resolvePlatformSettings(rows, { registrationOpen: true })).toEqual({ registrationOpen: true, moderationEnabled: false });
  });
});
