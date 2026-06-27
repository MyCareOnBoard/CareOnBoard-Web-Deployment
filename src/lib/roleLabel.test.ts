import { describe, it, expect } from "vitest";
import { matchesAgencyMode } from "./roleLabel";

describe("matchesAgencyMode", () => {
  it("filters DSP field staff to DDD mode only", () => {
    expect(matchesAgencyMode("dsp", "ddd")).toBe(true);
    expect(matchesAgencyMode("dsp", "hha")).toBe(false);
    expect(matchesAgencyMode("DSP", "ddd")).toBe(true);
  });

  it("filters caregiver/HHA field staff to HHA mode only", () => {
    expect(matchesAgencyMode("hha", "hha")).toBe(true);
    expect(matchesAgencyMode("hha", "ddd")).toBe(false);
    expect(matchesAgencyMode("caregiver", "hha")).toBe(true);
    expect(matchesAgencyMode("caregiver", "ddd")).toBe(false);
  });

  it("always shows shared roles (agency staff, admins, super) in both modes", () => {
    for (const role of ["Agency Admin", "Agency Staff", "Super Admin"]) {
      expect(matchesAgencyMode(role, "ddd")).toBe(true);
      expect(matchesAgencyMode(role, "hha")).toBe(true);
    }
  });

  it("treats a generic employee as DDD", () => {
    expect(matchesAgencyMode("employee", "ddd")).toBe(true);
    expect(matchesAgencyMode("employee", "hha")).toBe(false);
  });

  it("does not filter when mode is null", () => {
    expect(matchesAgencyMode("dsp", null)).toBe(true);
    expect(matchesAgencyMode("hha", null)).toBe(true);
    expect(matchesAgencyMode(undefined, null)).toBe(true);
  });
});
