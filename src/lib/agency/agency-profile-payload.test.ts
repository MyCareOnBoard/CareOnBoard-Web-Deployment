import { describe, it, expect } from "vitest";
import { OPERATIONAL_FORM_DEFAULTS } from "./operational-settings";
import {
  buildAgencyProfileUpdatePayload,
  buildCheckPayrollProfilePayload,
  CHECK_INDUSTRIES,
  type AgencyProfileFormValues,
} from "./agency-profile-payload";

const baseValues: AgencyProfileFormValues = {
  name: "Test Agency",
  legalBusinessName: "",
  dba: "",
  agencyType: "",
  npi: "",
  providerId: "",
  medicaidProviderId: "",
  email: "test@example.com",
  phone: "",
  address: "",
  county: "",
  city: "",
  state: "",
  zipCode: "",
  website: "",
  primaryColor: "#11CBD5",
  billingFormat: "",
  invoiceName: "",
  invoiceEmail: "",
  timezone: "",
  ...OPERATIONAL_FORM_DEFAULTS,
};

describe("buildAgencyProfileUpdatePayload", () => {
  it("sends only a changed timezone", () => {
    const payload = buildAgencyProfileUpdatePayload(
      { ...baseValues, timezone: "America/Chicago" },
      { timezone: true },
    );

    expect(payload).toEqual({ timezone: "America/Chicago" });
  });

  it("does not resend timezone with an unrelated profile change", () => {
    const payload = buildAgencyProfileUpdatePayload(
      { ...baseValues, timezone: "America/Chicago", name: "Updated Agency" },
      { name: true },
    );

    expect(payload).toEqual({
      name: "Updated Agency",
      legalBusinessName: null,
      dba: null,
      agencyType: null,
      npi: null,
      providerId: null,
      medicaidProviderId: null,
    });
  });

  it("includes only identity fields when identity is dirty", () => {
    const payload = buildAgencyProfileUpdatePayload(baseValues, { name: true });
    expect(payload.name).toBe("Test Agency");
    expect(payload.mileageRate).toBeUndefined();
    expect(payload.maxShiftPerDay).toBeUndefined();
  });

  it("includes only operational fields when operational is dirty", () => {
    const payload = buildAgencyProfileUpdatePayload(
      { ...baseValues, mileageRate: 0.67 },
      { mileageRate: true },
    );
    expect(payload.mileageRate).toBe(0.67);
    expect(payload.name).toBeUndefined();
    expect(payload.email).toBeUndefined();
  });

  it("returns empty payload when nothing is dirty", () => {
    const payload = buildAgencyProfileUpdatePayload(baseValues, {});
    expect(Object.keys(payload)).toHaveLength(0);
  });
});

describe("buildCheckPayrollProfilePayload", () => {
  it("omits empty nested groups so a blank draft remains a valid partial profile", () => {
    expect(buildCheckPayrollProfilePayload({
      legalAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" },
      officeAddress: { line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" },
    })).toEqual({});
  });

  it("matches every backend enum and drops unknown values", () => {
    expect(CHECK_INDUSTRIES).toEqual([
      "auto_or_machine_sales", "auto_or_machine_repair", "arts_or_entertainment_or_recreation", "cleaning_services", "consulting_services", "educational_services", "family_care_services", "financial_services", "food_and_beverage_retail_or_wholesale", "general_construction_or_general_contracting", "health_care", "hospitality_or_accommodation", "hvac_or_plumbing_or_electrical_contracting", "legal_services", "non_food_retail_or_wholesale", "other", "personal_care_services", "real_estate", "restaurant", "scientific_or_technical_services", "security_services", "tobacco_or_alcohol_sales", "transportation",
    ]);
    for (const industry of CHECK_INDUSTRIES) expect(buildCheckPayrollProfilePayload({ industry }).industry).toBe(industry);
    expect(buildCheckPayrollProfilePayload({ industry: "unknown" })).toEqual({});
  });
  it("uses the write-only replace operation and never emits a raw or retired signer field", () => {
    const payload = buildCheckPayrollProfilePayload({
      legalName: "Able Care LLC",
      ein: "12-3456789",
      entityType: "llc",
      industry: "health_care",
      legalAddress: { line1: "1 Main", line2: "", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
      officeName: "Main office",
      officeAddress: { line1: "2 Main", line2: "", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
      actualWorkLocationAttested: true,
      website: "https://able.example",
      phone: "+15125550123",
      payrollContactName: "Payroll",
      payrollContactEmail: "payroll@able.example",
      payrollContactPhone: "+15125550124",
      payFrequency: "weekly",
      firstPayday: "2026-09-04",
      secondPayday: "",
      firstPeriodEnd: "2026-09-03",
      payrollStartDate: "2026-08-28",
      expectedW2Workers: "1",
      einPresent: false,
    });

    expect(payload).toMatchObject({
      einChange: { mode: "replace", value: "12-3456789" },
      expectedWorkerCounts: { w2: 1, contractor: 0 },
      paySchedule: expect.objectContaining({ firstPayday: "2026-09-04", payrollStartDate: "2026-08-28", secondPayday: null }),
    });
    expect(JSON.stringify(payload)).not.toContain('"ein":');
    expect(JSON.stringify(payload)).not.toContain("payrollSchedule");
    expect(JSON.stringify(payload)).not.toContain("designatedSignerUserUid");
  });

  it("preserves an existing EIN without exposing it when no replacement is entered", () => {
    expect(buildCheckPayrollProfilePayload({ ein: "", einPresent: true })).toEqual({
      einChange: { mode: "preserve" },
    });
  });

  it("strips response-only fields even when an unsafe caller supplies them", () => {
    const unsafe = { legalName: "Able", einStatus: { present: true, last4: "6789" }, designatedSignerUserUid: "forged", payrollSchedule: { frequency: "weekly" } } as any;
    expect(buildCheckPayrollProfilePayload(unsafe)).toEqual({ legalName: "Able" });
  });

  it("emits canonical +1 US phones from the ten-digit payroll controls only", () => {
    expect(buildCheckPayrollProfilePayload({
      phone: "5125550123",
      payrollContactName: "Pat Payroll",
      payrollContactEmail: "payroll@able.example",
      payrollContactPhone: "5125550124",
    })).toEqual({
      phone: "+15125550123",
      payrollContact: { name: "Pat Payroll", email: "payroll@able.example", phone: "+15125550124" },
    });
  });
});
