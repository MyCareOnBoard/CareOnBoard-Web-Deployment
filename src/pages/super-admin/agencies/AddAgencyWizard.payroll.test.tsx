import { describe, expect, it } from "vitest";
import { buildCheckPayrollProfilePayload } from "@/lib/agency/agency-profile-payload";

describe("AddAgencyWizard payroll contract", () => {
  it("uses the production write mapper for blank drafts, preserve hydration, and replacement across all wizard requests", () => {
    const blank = buildCheckPayrollProfilePayload({ legalAddress: { line1: "", city: "", state: "", postalCode: "", country: "US" }, officeAddress: { line1: "", city: "", state: "", postalCode: "", country: "US" } });
    const hydrated = buildCheckPayrollProfilePayload({ einPresent: true, ein: "" });
    const replacement = buildCheckPayrollProfilePayload({ einPresent: true, ein: "12-3456789" });
    for (const request of [blank, hydrated, replacement]) {
      expect(JSON.stringify(request)).not.toMatch(/einStatus|designatedSigner|payrollSchedule|nextPayoutDate|last4/);
    }
    expect(blank).toEqual({});
    expect(hydrated).toEqual({ einChange: { mode: "preserve" } });
    expect(replacement).toEqual({ einChange: { mode: "replace", value: "12-3456789" } });
  });
});
