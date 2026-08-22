import { describe, expect, it, vi } from "vitest";
import { AgencyAccessScope, getAgencyAccessScopes } from "@/lib/api/agency-staff";
import {
  isCustomRole,
  isBillingRateValid,
  roundRate,
  isBillingPairComplete,
  staffHrFieldsValid,
  AGENCY_ACCESS_OPTIONS,
  normalizeAgencyAccessListForUi,
  toggleAgencyAccess,
} from "./staffForm";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {}, default: {} }));

describe("agency billing access form invariants", () => {
  it("uses canonical billing options and removes legacy values", () => {
    expect(AGENCY_ACCESS_OPTIONS).toContain("Payroll Management");
    expect(AGENCY_ACCESS_OPTIONS).toContain("Payroll Approval");
    expect(AgencyAccessScope.PAYROLL_APPROVAL).toBe("Payroll Approval");
    expect(getAgencyAccessScopes()).toContain("Payroll Approval");
    expect(AGENCY_ACCESS_OPTIONS).not.toContain("Billing & Management");
    expect(normalizeAgencyAccessListForUi(["Billing & Management", "Scheduling", "Mileage"])).toEqual(["Shift Management", "Mileage"]);
  });

  it("normalizes, deduplicates, and maintains elevated view implications", () => {
    expect(normalizeAgencyAccessListForUi(["Payroll Management", "Payroll Management"])).toEqual(["Payroll Management", "Payroll View"]);
    expect(toggleAgencyAccess([], "Claims Management")).toEqual(["Claims Management", "Claims View"]);
    expect(toggleAgencyAccess(["Claims Management", "Claims View"], "Claims Management")).toEqual(["Claims View"]);
    expect(toggleAgencyAccess(["Claims Management", "Claims View"], "Claims View")).toEqual([]);
    expect(toggleAgencyAccess([], "Payroll View")).toEqual(["Payroll View"]);
    expect(toggleAgencyAccess([], "Payroll Approval")).toEqual(["Payroll Approval", "Payroll View"]);
    expect(toggleAgencyAccess(["Payroll Approval", "Payroll View"], "Payroll View")).toEqual([]);
    expect(toggleAgencyAccess(["Mileage", "Incident"], "Payroll View")).toEqual(["Mileage", "Incident", "Payroll View"]);
  });
});

describe("isCustomRole", () => {
  it("is false for a default role", () => {
    expect(isCustomRole("Administrator")).toBe(false);
  });
  it("is true for a free-text role", () => {
    expect(isCustomRole("Regional Lead")).toBe(true);
  });
  it("is false for empty/whitespace", () => {
    expect(isCustomRole("")).toBe(false);
    expect(isCustomRole("   ")).toBe(false);
  });
});

describe("isBillingRateValid", () => {
  it("accepts a positive number", () => {
    expect(isBillingRateValid("27.50")).toBe(true);
    expect(isBillingRateValid("0")).toBe(true);
  });
  it("rejects empty, negative, and non-numeric", () => {
    expect(isBillingRateValid("")).toBe(false);
    expect(isBillingRateValid("-1")).toBe(false);
    expect(isBillingRateValid("abc")).toBe(false);
  });
});

describe("roundRate", () => {
  it("rounds to 2 decimals", () => {
    expect(roundRate("27.555")).toBe("27.56");
    expect(roundRate("27.5")).toBe("27.5");
  });
  it("passes through empty/non-numeric untouched", () => {
    expect(roundRate("")).toBe("");
    expect(roundRate("abc")).toBe("abc");
  });
});

describe("isBillingPairComplete", () => {
  it("is true when both empty or both set", () => {
    expect(isBillingPairComplete("", "")).toBe(true);
    expect(isBillingPairComplete("hourly", "25")).toBe(true);
  });
  it("is false when only one is set", () => {
    expect(isBillingPairComplete("hourly", "")).toBe(false);
    expect(isBillingPairComplete("", "25")).toBe(false);
  });
});

describe("staffHrFieldsValid", () => {
  const full = {
    role: "Administrator",
    employmentType: "full_time" as const,
    employmentStartDate: "2026-08-20",
    employmentEndDate: "",
    billingType: "hourly" as const,
    billingRate: "25",
    compensationEffectiveDate: "2026-08-20",
  };

  it("create requires every field", () => {
    expect(staffHrFieldsValid({ mode: "create", ...full })).toBe(true);
    expect(staffHrFieldsValid({ mode: "create", ...full, role: "" })).toBe(false);
    expect(staffHrFieldsValid({ mode: "create", ...full, employmentType: "" })).toBe(false);
    expect(staffHrFieldsValid({ mode: "create", ...full, billingRate: "" })).toBe(false);
    expect(staffHrFieldsValid({ mode: "create", ...full, employmentStartDate: "" })).toBe(false);
    expect(staffHrFieldsValid({ mode: "create", ...full, compensationEffectiveDate: "" })).toBe(false);
  });

  it("rejects an employment end date before the start date", () => {
    expect(staffHrFieldsValid({
      mode: "create",
      ...full,
      employmentEndDate: "2026-08-19",
    })).toBe(false);
  });

  it("edit allows all empty (legacy backfill)", () => {
    expect(
      staffHrFieldsValid({ mode: "edit", role: "", employmentType: "", employmentStartDate: "", employmentEndDate: "", billingType: "", billingRate: "", compensationEffectiveDate: "" })
    ).toBe(true);
  });

  it("edit still rejects a half-filled billing pair", () => {
    expect(
      staffHrFieldsValid({ mode: "edit", role: "", employmentType: "", employmentStartDate: "", employmentEndDate: "", billingType: "hourly", billingRate: "", compensationEffectiveDate: "" })
    ).toBe(false);
  });

  it("edit requires current pay terms and their effective date as one unit", () => {
    expect(staffHrFieldsValid({
      mode: "edit",
      role: "",
      employmentType: "",
      employmentStartDate: "",
      employmentEndDate: "",
      billingType: "hourly",
      billingRate: "25",
      compensationEffectiveDate: "",
    })).toBe(false);
    expect(staffHrFieldsValid({
      mode: "edit",
      role: "",
      employmentType: "",
      employmentStartDate: "",
      employmentEndDate: "",
      billingType: "",
      billingRate: "",
      compensationEffectiveDate: "2026-08-20",
    })).toBe(false);
  });
});
