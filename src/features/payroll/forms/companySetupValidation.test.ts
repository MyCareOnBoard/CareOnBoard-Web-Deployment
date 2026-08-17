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
  it("uses the payroll setup terminology in user-facing validation errors", () => {
    expect(validateCompanySetup({
      entityType: "unsupported", ein: "123", legalAddress: { line1: "1 Legal Street", line2: "", city: "", state: "TX", postalCode: "78701", country: "US" },
      officeName: "", officeAddress: { line1: "2 Work Street", line2: "", city: "", state: "TX", postalCode: "78702", country: "US" }, actualWorkLocationAttested: false,
      website: "invalid", phone: "123", payrollContactEmail: "invalid", payrollContactPhone: "123",
      payFrequency: "weekly", firstPayday: "2026-02-30", firstPeriodEnd: "2026-02-30", payrollStartDate: "2026-02-30", expectedW2Workers: "-1",
    })).toMatchObject({
      payrollEntityType: "Select a supported business structure.",
      payrollEin: "Enter a nine-digit federal tax ID.",
      payrollLegalAddress: "Enter a complete U.S. legal business address.",
      payrollOfficeName: "Enter the primary workplace name.",
      payrollOfficeAddress: "Provide a complete primary workplace address.",
      payrollActualWorkLocationAttested: "Confirm employees physically work at this location.",
      websiteUrl: "Enter an http or https company website.",
      mainPhone: "Enter an international company phone number.",
      payrollContactName: "Enter the payroll contact’s full name.",
      payrollContactEmail: "Enter a valid payroll contact’s email address.",
      payrollContactPhone: "Enter an international payroll contact’s phone number.",
      payrollFirstPayday: "Enter a valid first scheduled payday.",
      payrollFirstPeriodEnd: "Enter a valid first pay period end date.",
      payrollStartDate: "Enter a valid payroll tracking start date.",
      expectedW2Workers: "Enter a whole number of W-2 employees, 0 or more.",
    });
  });
  it("allows empty address objects in a blank needs-information draft", () => {
    expect(validateCompanySetup({ legalAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" }, officeAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" } })).toEqual({});
  });
});

describe("isCompanySetupComplete", () => {
  it("requires EIN but does not require retired proposed signer fields", () => {
    expect(isCompanySetupComplete({ ...completeSetup, einPresent: false })).toBe(false);
    expect(isCompanySetupComplete(completeSetup)).toBe(true);
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
