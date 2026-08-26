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
  it("round-trips both structured service addresses with a separate attestation for each", () => {
    const form = clientToFormData({
      id: "client-1",
      type: "ddd",
      primaryAddress: { ...structuredAddress, addressFingerprint: "server-only", providerAddressId: "provider-only" },
      secondaryAddress: { ...structuredAddress, address: "99 New Street, Newark, NJ 07102, USA", line1: "99 New Street", line2: null },
      payrollServiceLocations: [
        { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14", attesterUid: "server-only" },
        { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-09-01", assignmentId: "server-only" },
      ],
      providerAssignmentId: "server-owned",
    } as unknown as Client);

    const payload = formDataToApiPayload(form, false, true, false);

    expect(payload.primaryAddress).toEqual(structuredAddress);
    expect(payload.secondaryAddress).toEqual({ ...structuredAddress, address: "99 New Street, Newark, NJ 07102, USA", line1: "99 New Street", line2: null });
    expect(payload.payrollServiceLocations).toEqual([
      { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-09-01" },
    ]);
    expect(payload).not.toHaveProperty("providerAssignmentId");
  });

  it("omits unset payroll service locations", () => {
    const form = createInitialAddClientFormData();
    form.stage1.address = structuredAddress.address;
    form.stage1.location = structuredAddress.location;
    Object.assign(form.stage1, structuredAddress);

    expect(formDataToApiPayload(form, false, true, false)).not.toHaveProperty("payrollServiceLocations");
  });

  it("preserves an absent payroll service-location field through hydration and serialization", () => {
    const form = clientToFormData({ id: "client-1", primaryAddress: structuredAddress } as Client);

    expect(form.stage1.payrollServiceLocations).toBeUndefined();
    expect(formDataToApiPayload(form, false, true, false)).not.toHaveProperty("payrollServiceLocations");
  });

  it("sends an explicit empty service-location selection", () => {
    const form = createInitialAddClientFormData();
    form.stage1.address = structuredAddress.address;
    form.stage1.location = structuredAddress.location;
    Object.assign(form.stage1, structuredAddress);

    form.stage1.payrollServiceLocations = [];
    expect(formDataToApiPayload(form, false, true, false)).toMatchObject({
      payrollServiceLocations: [],
    });
  });

  it("rejects an attestation without a valid calendar date", () => {
    const form = createInitialAddClientFormData();
    form.stage1.address = structuredAddress.address;
    form.stage1.location = structuredAddress.location;
    Object.assign(form.stage1, structuredAddress);

    form.stage1.payrollServiceLocations = [{ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-02-30" }];
    expect(() => formDataToApiPayload(form, false, true, false)).toThrow(
      "Enter a valid effective date for the actual service-location attestation.",
    );
  });

  it("rejects a secondary-location attestation when the structured secondary identity is incomplete", () => {
    const form = createInitialAddClientFormData();
    Object.assign(form.stage1, structuredAddress, { payrollServiceLocations: [{ source: "secondaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" }] });
    expect(() => formDataToApiPayload(form, false, true, false)).toThrow("Select a complete secondary address before attesting to the actual service location.");
  });

  it("drops malformed hydrated payroll rows while retaining valid rows", () => {
    const hydrated = clientToFormData({ id: "client-1", primaryAddress: structuredAddress, payrollServiceLocations: [
      { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-02-30" },
    ] } as Client);
    expect(hydrated.stage1.payrollServiceLocations).toEqual([{ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" }]);
  });

  it("keeps only the first valid row for each service-address source when hydrating", () => {
    const hydrated = clientToFormData({
      id: "client-1",
      primaryAddress: structuredAddress,
      secondaryAddress: { ...structuredAddress, address: "99 New Street, Newark, NJ 07102, USA", line1: "99 New Street" },
      payrollServiceLocations: [
        { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
        { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-15" },
        { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-09-01" },
      ],
    } as Client);

    expect(hydrated.stage1.payrollServiceLocations).toEqual([
      { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-09-01" },
    ]);
  });

  it("serializes no more than one row per service-address source", () => {
    const form = createInitialAddClientFormData();
    Object.assign(form.stage1, structuredAddress, {
      secondaryAddress: "99 New Street, Newark, NJ 07102, USA",
      secondaryLine1: "99 New Street", secondaryCity: "Newark", secondaryState: "NJ", secondaryPostalCode: "07102", secondaryCountry: "US",
      payrollServiceLocations: [
        { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-14" },
        { source: "primaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-08-15" },
        { source: "secondaryAddress" as const, attestedActualServiceLocation: true as const, effectiveFrom: "2026-09-01" },
      ],
    });

    expect(formDataToApiPayload(form, false, true, false).payrollServiceLocations).toEqual([
      { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" },
      { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-09-01" },
    ]);
  });

  it("hydrates an HHA apartment into canonical line2 when the stored primary address lacks one", () => {
    const form = clientToFormData({ id: "client-1", type: "hha", primaryAddress: { ...structuredAddress, line2: "   " }, homeInfo: { apartmentNumber: "Unit 3" }, payrollServiceLocations: [{ source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-08-14" }] } as Client);
    expect(form.stage1.line2).toBe("Unit 3");
    expect(form.stage1.payrollServiceLocations).toEqual([]);
    expect(formDataToApiPayload(form, false, true, false).payrollServiceLocations).toEqual([]);
    expect(formDataToApiPayload(form, false, true, false).primaryAddress?.line2).toBe("Unit 3");
  });
});
