import { describe, expect, it } from "vitest";
import { validateCompanySetup } from "./companySetupValidation";

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
