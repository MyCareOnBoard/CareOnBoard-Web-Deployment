import { describe, expect, it } from "vitest";
import { isPersonalCareService, resolveHhaNoteType } from "./resolveHhaNoteType";

describe("isPersonalCareService", () => {
  it("matches the Personal Care service type case-insensitively", () => {
    expect(isPersonalCareService("Personal Care")).toBe(true);
    expect(isPersonalCareService("personal care")).toBe(true);
    expect(isPersonalCareService("  PERSONAL CARE  ")).toBe(true);
  });

  it("falls back to known personal-care codes for legacy authorizations", () => {
    expect(isPersonalCareService(undefined, "T1019")).toBe(true);
    expect(isPersonalCareService("", "t1019")).toBe(true);
  });

  it("returns false for other HHA services", () => {
    expect(isPersonalCareService("Private Duty Nursing", "T1002")).toBe(false);
    expect(isPersonalCareService(undefined, "S5102")).toBe(false);
    expect(isPersonalCareService()).toBe(false);
  });
});

describe("resolveHhaNoteType", () => {
  it("resolves personal-care services to the checklist note", () => {
    expect(resolveHhaNoteType("Personal Care")).toBe("hha-personal-care");
    expect(resolveHhaNoteType(undefined, "T1019")).toBe("hha-personal-care");
  });

  it("resolves every other HHA service to the activity-log note", () => {
    expect(resolveHhaNoteType("Adult Medical Day Care", "S5102")).toBe("hha-service-log");
    expect(resolveHhaNoteType(undefined, undefined)).toBe("hha-service-log");
  });
});
