import { describe, expect, it } from "vitest";
import { isCompanySetupComplete, validateCompanySetup } from "./companySetupValidation";

const completeSetup = {
  legalName: "Able Care LLC",
  einPresent: true,
  entityType: "llc",
  industry: "health_care",
  legalAddress: { line1: "1 Legal Street", line2: "", city: "Austin", state: "TX", postalCode: "78701", country: "US" as const },
  officeName: "Main office",
  officeAddress: { line1: "2 Work Street", line2: "", city: "Austin", state: "TX", postalCode: "78702", country: "US" as const },
  actualWorkLocationAttested: true,
  website: "https://able.example",
  phone: "+15125550123",
  payrollContactName: "Pay Roll",
  payrollContactEmail: "payroll@able.example",
  payrollContactPhone: "+15125550124",
  payFrequency: "weekly",
  firstPayday: "2026-09-04",
  secondPayday: "",
  firstPeriodEnd: "2026-09-03",
  payrollStartDate: "2026-08-28",
  proposedSignerFirstName: "Ada",
  proposedSignerLastName: "Owner",
  proposedSignerTitle: "Owner",
  proposedSignerEmail: "ada@able.example",
  expectedW2Workers: "3",
};

describe("validateCompanySetup", () => {
  it("rejects malformed partial values without requiring an incomplete draft", () => {
    expect(validateCompanySetup({ ein: "masked-6789", payFrequency: "weekly", firstPayday: "2026-02-30", firstPeriodEnd: "2026-02-27", payrollStartDate: "2026-02-01" })).toMatchObject({ payrollEin: expect.any(String), payrollFirstPayday: expect.any(String) });
  });
  it("enforces the semimonthly second-payday and W-2-only constraints", () => {
    expect(validateCompanySetup({ payFrequency: "semimonthly", firstPayday: "2026-01-31", secondPayday: "2026-01-30", firstPeriodEnd: "2026-01-30", payrollStartDate: "2026-01-01", expectedW2Workers: "-1" })).toMatchObject({ payrollSecondPayday: expect.any(String), expectedW2Workers: expect.any(String) });
    expect(validateCompanySetup({ payFrequency: "semimonthly", firstPayday: "2026-01-15", secondPayday: "2026-02-16", firstPeriodEnd: "2026-01-14", payrollStartDate: "2026-01-01" })).toMatchObject({ payrollSecondPayday: expect.any(String) });
  });
  it("allows empty address objects in a blank needs-information draft", () => {
    expect(validateCompanySetup({ legalAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" }, officeAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" } })).toEqual({});
  });
});

describe("isCompanySetupComplete", () => {
  it("requires EIN and proposed signer even when every other group is complete", () => {
    expect(isCompanySetupComplete({ ...completeSetup, einPresent: false })).toBe(false);
    expect(isCompanySetupComplete({ ...completeSetup, proposedSignerEmail: "" })).toBe(false);
  });

  it.each([
    ["legal name", { legalName: "" }],
    ["entity type", { entityType: "" }],
    ["industry", { industry: "" }],
    ["legal address", { legalAddress: undefined }],
    ["workplace", { officeName: "" }],
    ["website", { website: "" }],
    ["phone", { phone: "" }],
    ["payroll contact", { payrollContactEmail: "" }],
    ["schedule", { payFrequency: "" }],
    ["worker count", { expectedW2Workers: undefined }],
  ])("keeps the profile incomplete without %s", (_label, missing) => {
    expect(isCompanySetupComplete({ ...completeSetup, ...missing })).toBe(false);
  });

  it("returns ready only for the complete backend profile", () => {
    expect(isCompanySetupComplete(completeSetup)).toBe(true);
  });
});
