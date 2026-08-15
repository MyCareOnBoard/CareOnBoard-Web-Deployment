import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import { createInitialAddClientFormData } from "../types/formData";
import { clientToFormData } from "./clientToFormData";
import { formDataToApiPayload } from "./formDataToApiPayload";

const structuredAddress = {
  address: "42 Service Lane, Newark, NJ 07102, USA",
  location: { lat: "40.7357", lon: "-74.1724" },
  countyState: "Essex / New Jersey",
  zipCode: "07102",
  line1: "42 Service Lane",
  line2: "Suite 3",
  city: "Newark",
  state: "NJ",
  postalCode: "07102",
  country: "US",
};

describe("client payroll service-location payload", () => {
  it("round-trips the allowlisted structured primary address and exact attestation DTO", () => {
    const form = clientToFormData({
      id: "client-1",
      type: "ddd",
      primaryAddress: { ...structuredAddress, addressFingerprint: "server-only", providerAddressId: "provider-only" },
      payrollServiceLocation: {
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-08-14",
        attesterUid: "server-only",
        attestedAt: "server-only",
        assignmentId: "server-only",
      },
      providerAssignmentId: "server-owned",
    } as unknown as Client);

    const payload = formDataToApiPayload(form, false, true, false);

    expect(payload.primaryAddress).toEqual(structuredAddress);
    expect(payload.payrollServiceLocation).toEqual({
      source: "primaryAddress",
      attestedActualServiceLocation: true,
      effectiveFrom: "2026-08-14",
    });
    expect(payload).not.toHaveProperty("providerAssignmentId");
  });

  it("omits an unset attestation", () => {
    const form = createInitialAddClientFormData();
    form.stage1.address = structuredAddress.address;
    form.stage1.location = structuredAddress.location;
    Object.assign(form.stage1, structuredAddress);

    expect(formDataToApiPayload(form, false, true, false)).not.toHaveProperty("payrollServiceLocation");
  });

  it("sends an explicit opt-out", () => {
    const form = createInitialAddClientFormData();
    form.stage1.address = structuredAddress.address;
    form.stage1.location = structuredAddress.location;
    Object.assign(form.stage1, structuredAddress);

    form.stage1.payrollServiceLocation = null;
    expect(formDataToApiPayload(form, false, true, false)).toMatchObject({
      payrollServiceLocation: null,
    });
  });

  it("rejects an attestation without a valid calendar date", () => {
    const form = createInitialAddClientFormData();
    form.stage1.address = structuredAddress.address;
    form.stage1.location = structuredAddress.location;
    Object.assign(form.stage1, structuredAddress);

    form.stage1.payrollServiceLocation = {
      source: "primaryAddress",
      attestedActualServiceLocation: true,
      effectiveFrom: "2026-02-30",
    };
    expect(() => formDataToApiPayload(form, false, true, false)).toThrow(
      "Enter a valid effective date for the actual service-location attestation.",
    );
  });

  it("rejects a dated attestation when the structured primary identity is incomplete", () => {
    const form = createInitialAddClientFormData();
    Object.assign(form.stage1, structuredAddress, { payrollServiceLocation: { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" }, country: "USA" });
    expect(() => formDataToApiPayload(form, false, true, false)).toThrow("Select a complete primary address before attesting to the actual service location.");
  });

  it("drops malformed hydrated payroll data but preserves an explicit server opt-out", () => {
    const malformed = clientToFormData({ id: "client-1", primaryAddress: { ...structuredAddress, providerAddressFingerprint: "server-only" }, payrollServiceLocation: { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-02-30", attesterUid: "server-only" } } as unknown as Client);
    expect(malformed.stage1.payrollServiceLocation).toBeUndefined();
    expect(formDataToApiPayload(malformed, false, true, false)).not.toHaveProperty("payrollServiceLocation");

    const optOut = clientToFormData({ id: "client-1", primaryAddress: structuredAddress, payrollServiceLocation: null } as Client);
    expect(optOut.stage1.payrollServiceLocation).toBeNull();
  });

  it("hydrates an HHA apartment into canonical line2 when the stored primary address lacks one", () => {
    const form = clientToFormData({ id: "client-1", type: "hha", primaryAddress: { ...structuredAddress, line2: "   " }, homeInfo: { apartmentNumber: "Unit 3" }, payrollServiceLocation: { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" } } as Client);
    expect(form.stage1.line2).toBe("Unit 3");
    expect(form.stage1.payrollServiceLocation).toBeNull();
    expect(formDataToApiPayload(form, false, true, false).payrollServiceLocation).toBeNull();
    expect(formDataToApiPayload(form, false, true, false).primaryAddress?.line2).toBe("Unit 3");
  });
});
