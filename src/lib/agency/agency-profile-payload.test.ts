import { describe, it, expect } from "vitest";
import { OPERATIONAL_FORM_DEFAULTS } from "./operational-settings";
import {
  buildAgencyProfileUpdatePayload,
  type AgencyProfileFormValues,
} from "./agency-profile-payload";

const baseValues: AgencyProfileFormValues = {
  name: "Test Agency",
  legalBusinessName: "",
  dba: "",
  agencyType: "",
  ein: "",
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
  payrollScheduleFrequency: "biweekly",
  payrollScheduleNextPayoutDate: "",
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
