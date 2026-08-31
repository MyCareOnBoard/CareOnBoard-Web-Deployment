import { describe, expect, it } from "vitest";
import { isCompanySetupComplete, isUsBankingDay, localIsoDate, validateCompanySetup, validatePaySchedule } from "./companySetupValidation";

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
  phone: "5125550123",
  payrollContactName: "Pay Roll",
  payrollContactEmail: "payroll@able.example",
  payrollContactPhone: "5125550124",
  payFrequency: "weekly",
  firstPayday: "2026-09-04",
  expectedW2Workers: "3",
};

const validSchedule = {
  frequency: "weekly" as const,
  payrollStartDate: "2026-08-17",
  firstPeriodEnd: "2026-08-28",
  firstPayday: "2026-09-04",
  secondPayday: "",
};

describe("validateCompanySetup", () => {
  it("validates bootstrap payroll intent without requiring full schedule fields", () => {
    expect(validateCompanySetup({ payFrequency: "weekly", firstPayday: "2026-09-04" })).toEqual({});
    expect(validateCompanySetup({ payFrequency: "weekly", firstPayday: "2026-02-30" })).toMatchObject({ payrollFirstPayday: "Enter a valid first scheduled payday." });
  });

  it("keeps partial company drafts optional and validates participating fields", () => {
    expect(validateCompanySetup({ legalAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" }, officeAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" } })).toEqual({});
    expect(validateCompanySetup({ ein: "123", website: "invalid", phone: "123", expectedW2Workers: "-1" })).toMatchObject({
      payrollEin: "Enter a nine-digit federal tax ID.",
      websiteUrl: "Enter an http or https company website.",
      mainPhone: "Enter a valid US ten-digit company phone number.",
      expectedW2Workers: "Enter a whole number of W-2 employees, 0 or more.",
    });
  });

  it("preserves validation for non-schedule payroll profile fields", () => {
    expect(validateCompanySetup({
      entityType: "unsupported",
      industry: "unsupported",
      legalAddress: { line1: "1 Legal Street", line2: "", city: "", state: "TX", postalCode: "78701", country: "US" },
      officeAddress: { line1: "2 Work Street", line2: "", city: "", state: "TX", postalCode: "78702", country: "US" },
      actualWorkLocationAttested: false,
    })).toMatchObject({
      payrollEntityType: "Select a supported business structure.",
      payrollIndustry: "Select a supported industry.",
      payrollLegalAddress: "Enter a complete U.S. legal business address.",
      payrollOfficeName: "Enter the primary workplace name.",
      payrollOfficeAddress: "Provide a complete primary workplace address.",
      payrollActualWorkLocationAttested: "Confirm employees physically work at this location.",
    });
  });

  it.each(["512555012", "51255501234", "+15125550123", "512-555-0123", "5125550123 ext 1", "５１２５５５０１２３"])("rejects malformed US company phones: %s", (phone) => {
    expect(validateCompanySetup({ phone, payrollContactName: "Pat Payroll", payrollContactEmail: "pat@able.example", payrollContactPhone: phone })).toMatchObject({
      mainPhone: "Enter a valid US ten-digit company phone number.",
      payrollContactPhone: "Enter a valid US ten-digit payroll contact phone number.",
    });
  });
});

describe("validatePaySchedule", () => {
  it("uses the local civil day and observes a Saturday New Year's Day on Friday", () => {
    expect(localIsoDate({
      getFullYear: () => 2026,
      getMonth: () => 7,
      getDate: () => 29,
    } as Date)).toBe("2026-08-29");
    expect(isUsBankingDay("2021-12-31")).toBe(false);
  });

  it.each([
    ["frequency", { frequency: "" }, "Select a supported pay frequency."],
    ["payrollStartDate", { payrollStartDate: "" }, "Enter a valid payroll tracking start date."],
    ["payrollStartDate", { payrollStartDate: "2026-02-30" }, "Enter a valid payroll tracking start date."],
    ["firstPeriodEnd", { firstPeriodEnd: "" }, "Enter a valid first pay period end date."],
    ["firstPeriodEnd", { firstPeriodEnd: "2026-02-30" }, "Enter a valid first pay period end date."],
    ["firstPayday", { firstPayday: "" }, "Enter a valid first scheduled payday."],
    ["firstPayday", { firstPayday: "2026-02-30" }, "Enter a valid first scheduled payday."],
  ] as const)("validates %s independently", (field, override, message) => {
    expect(validatePaySchedule({ ...validSchedule, ...override }, "2026-08-28")).toMatchObject({ [field]: message });
  });

  it.each([
    ["today", "2026-08-28", "Choose a future U.S. banking day. Today, weekends, and Federal Reserve holidays are not accepted."],
    ["weekend", "2026-08-29", "Choose a U.S. banking day. Weekends and Federal Reserve holidays are not accepted."],
    ["Federal Reserve holiday", "2026-09-07", "Choose a U.S. banking day. Weekends and Federal Reserve holidays are not accepted."],
  ])("rejects a first payday on %s", (_reason, firstPayday, message) => {
    expect(validatePaySchedule({ ...validSchedule, firstPayday }, "2026-08-28")).toMatchObject({ firstPayday: message });
  });

  it("returns relationship and unrelated field errors together", () => {
    expect(validatePaySchedule({ frequency: "semimonthly", payrollStartDate: "2026-09-05", firstPeriodEnd: "2026-09-04", firstPayday: "2026-08-29", secondPayday: "" }, "2026-08-28")).toEqual({
      payrollStartDate: "The payroll tracking start date must be on or before the first pay period end date.",
      firstPeriodEnd: "The first pay period must end before the first scheduled payday.",
      firstPayday: "Choose a U.S. banking day. Weekends and Federal Reserve holidays are not accepted.",
      secondPayday: "Enter a valid second scheduled payday.",
    });
  });

  it("rejects a first period that ends on or after payday", () => {
    expect(validatePaySchedule({ ...validSchedule, firstPeriodEnd: "2026-09-04" }, "2026-08-28")).toMatchObject({ firstPeriodEnd: "The first pay period must end before the first scheduled payday." });
  });

  it.each([
    ["", "Enter a valid second scheduled payday."],
    ["2026-02-30", "Enter a valid second scheduled payday."],
    ["2026-09-07", "Choose a U.S. banking day. Weekends and Federal Reserve holidays are not accepted."],
    ["2026-09-04", "The second scheduled payday must be later than the first and within one calendar month."],
    ["2026-10-05", "The second scheduled payday must be later than the first and within one calendar month."],
  ])("validates a semimonthly second payday of %s", (secondPayday, message) => {
    expect(validatePaySchedule({ ...validSchedule, frequency: "semimonthly", secondPayday }, "2026-08-28")).toMatchObject({ secondPayday: message });
  });

  it("accepts a valid full schedule", () => {
    expect(validatePaySchedule(validSchedule, "2026-08-28")).toEqual({});
  });
});

describe("isCompanySetupComplete", () => {
  it("requires the two-field payroll intent and no full schedule fields", () => {
    expect(isCompanySetupComplete({ ...completeSetup, einPresent: false })).toBe(false);
    expect(isCompanySetupComplete({ ...completeSetup, payFrequency: "" })).toBe(false);
    expect(isCompanySetupComplete({ ...completeSetup, firstPayday: "" })).toBe(false);
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
    ["worker count", { expectedW2Workers: undefined }],
  ])("keeps the profile incomplete without %s", (_label, missing) => {
    expect(isCompanySetupComplete({ ...completeSetup, ...missing })).toBe(false);
  });
});
