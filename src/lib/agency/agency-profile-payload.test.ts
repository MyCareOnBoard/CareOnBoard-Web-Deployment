import { describe, it, expect } from "vitest";
import { OPERATIONAL_FORM_DEFAULTS } from "./operational-settings";
import {
  buildAgencyProfileUpdatePayload,
  buildCheckPayrollProfilePayload,
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
  ...OPERATIONAL_FORM_DEFAULTS,
};

describe("buildAgencyProfileUpdatePayload", () => {
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
  it("uses the write-only replace operation and never emits a raw or legacy EIN", () => {
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
      proposedSignerFirstName: "Ada",
      proposedSignerLastName: "Owner",
      proposedSignerTitle: "Owner",
      proposedSignerEmail: "ada@able.example",
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
});
