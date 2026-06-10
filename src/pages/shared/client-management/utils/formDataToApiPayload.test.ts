import { describe, expect, it } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { formDataToApiPayload } from "./formDataToApiPayload";

describe("formDataToApiPayload HHA", () => {
  it("maps HHA-specific fields and does not require DDD outcomes", () => {
    const data = createInitialAddClientFormData();
    data.type = "hha";
    data.stage1.firstName = "Jane";
    data.stage1.lastName = "Client";
    data.stage1.address = "10 Main St";
    data.stage1.countyState = "Essex / NJ";
    data.stage1.zipCode = "07001";
    data.stage1.medicareId = "M-123";
    data.stage1.referralInfo = {
      source: "Hospital",
      organization: "General Hospital",
      contactPerson: "Nurse Intake",
      contactNumber: "555-1000",
    };
    data.stage2.hhaAuthorizations = [
      {
        id: "auth-1",
        authorizationNumber: "A123",
        serviceId: "T1019",
        serviceName: "Personal Care Assistant",
        serviceCode: "T1019",
        approvedHours: "20",
        payerSource: "UHC",
        unitType: "15-min",
        rate: "6.67",
        serviceType: "Personal Care",
        clientPayType: "15-min",
        assignedDsps: [{ id: "dsp-1", name: "Jamie Helper" }],
      },
    ];

    const payload = formDataToApiPayload(data, false, true, false);

    expect(payload.type).toBe("hha");
    expect(payload.medicareId).toBe("M-123");
    expect(payload.referralInfo?.source).toBe("Hospital");
    expect(payload.hhaAuthorizations?.[0]?.serviceCode).toBe("T1019");
    expect(payload.hhaAuthorizations?.[0]?.serviceType).toBe("Personal Care");
    expect(payload.hhaAuthorizations?.[0]?.assignedDsps).toEqual([
      { id: "dsp-1", name: "Jamie Helper" },
    ]);
    expect(payload.outcomes).toEqual([]);
    expect(payload.ispMetadata).toBeUndefined();
  });

  it("keeps service-only HHA authorization rows when a catalog service is selected", () => {
    const data = createInitialAddClientFormData();
    data.type = "hha";
    data.stage1.firstName = "Jane";
    data.stage1.lastName = "Client";
    data.stage1.address = "10 Main St";
    data.stage1.location = { lat: "40.7", lon: "-74.0" };
    data.stage2.hhaAuthorizations = [
      {
        id: "auth-1",
        serviceId: "T1019",
        serviceCode: "T1019",
        serviceName: "Personal Care Assistant",
        unitType: "15-min",
        rate: "6.67",
        assignedDsps: [],
      },
    ];

    const payload = formDataToApiPayload(data, false, true, false);

    expect(payload.hhaAuthorizations?.[0]?.serviceId).toBe("T1019");
  });

  it("omits seeded empty HHA insurance and authorization rows", () => {
    const data = createInitialAddClientFormData();
    data.type = "hha";
    data.stage1.firstName = "Jane";
    data.stage1.lastName = "Client";
    data.stage1.address = "10 Main St";
    data.stage1.location = { lat: "40.7", lon: "-74.0" };

    const payload = formDataToApiPayload(data, false, true, false);

    expect(payload.insuranceInfo).toBeUndefined();
    expect(payload.hhaAuthorizations).toBeUndefined();
  });
});
