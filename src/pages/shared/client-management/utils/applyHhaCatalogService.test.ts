import { describe, expect, it } from "vitest";
import { createEmptyHhaAuthorization } from "../types/formData";
import {
  applyHhaCatalogIdentity,
  applyHhaCatalogService,
  unitTypeToPayType,
} from "./applyHhaCatalogService";
import type { Service } from "@/lib/api/services";

const catalogService: Service = {
  id: "T1019",
  program: "hha",
  type: "Personal Care",
  name: "Personal Care Assistant (Individual Services)",
  code: "T1019",
  unitType: "15-min",
  defaultRate: "6.67",
  modifier: null,
};

describe("applyHhaCatalogService", () => {
  it("maps catalog fields and preserves payer metadata and DSPs", () => {
    const row = {
      ...createEmptyHhaAuthorization(),
      authorizationNumber: "PA-100",
      approvedHours: "20",
      payerSource: "Medicaid",
      assignedDsps: [{ id: "dsp-1", name: "Jamie Helper" }],
    };

    const next = applyHhaCatalogService(row, catalogService);

    expect(next.serviceId).toBe("T1019");
    expect(next.serviceCode).toBe("T1019");
    expect(next.serviceName).toBe("Personal Care Assistant (Individual Services)");
    expect(next.unitType).toBe("15-min");
    expect(next.rate).toBe("6.67");
    expect(next.serviceType).toBe("Personal Care");
    expect(next.clientPayType).toBe("15-min");
    expect(next.authorizationNumber).toBe("PA-100");
    expect(next.approvedHours).toBe("20");
    expect(next.payerSource).toBe("Medicaid");
    expect(next.assignedDsps).toEqual([{ id: "dsp-1", name: "Jamie Helper" }]);
  });

  it("clears catalog fields when service selection is cleared", () => {
    const row = applyHhaCatalogService(createEmptyHhaAuthorization(), catalogService);
    const cleared = applyHhaCatalogService(row, undefined);

    expect(cleared.serviceId).toBeUndefined();
    expect(cleared.serviceCode).toBe("");
    expect(cleared.rate).toBe("");
    expect(cleared.serviceType).toBeUndefined();
  });

  it("preserves the user-entered service goal when applying or clearing a catalog service", () => {
    const row = {
      ...createEmptyHhaAuthorization(),
      goal: "Improve mobility",
    };

    const applied = applyHhaCatalogService(row, catalogService);
    expect(applied.goal).toBe("Improve mobility");

    const cleared = applyHhaCatalogService(applied, undefined);
    expect(cleared.goal).toBe("Improve mobility");
  });

  it("unitTypeToPayType normalizes catalog unit types", () => {
    expect(unitTypeToPayType("15-min")).toBe("15-min");
    expect(unitTypeToPayType("daily")).toBe("daily");
    expect(unitTypeToPayType("hourly")).toBe("hourly");
  });
});

describe("applyHhaCatalogIdentity", () => {
  it("applies catalog identity but preserves authorization-specifics", () => {
    const row = {
      ...createEmptyHhaAuthorization(),
      authorizationNumber: "PA-200",
      approvedHours: "30",
      payerSource: "Medicaid",
      rate: "10.00",
      unitType: "hourly",
      assignedDsps: [{ id: "dsp-1", name: "Jamie Helper" }],
    };

    const next = applyHhaCatalogIdentity(row, catalogService);

    // Catalog is canonical for identity.
    expect(next.serviceId).toBe("T1019");
    expect(next.serviceCode).toBe("T1019");
    expect(next.serviceName).toBe("Personal Care Assistant (Individual Services)");
    expect(next.unitType).toBe("15-min");
    expect(next.clientPayType).toBe("15-min");
    // Document wins for auth-specifics; doc rate kept over catalog defaultRate.
    expect(next.rate).toBe("10.00");
    expect(next.authorizationNumber).toBe("PA-200");
    expect(next.approvedHours).toBe("30");
    expect(next.payerSource).toBe("Medicaid");
    expect(next.assignedDsps).toEqual([{ id: "dsp-1", name: "Jamie Helper" }]);
  });

  it("fills a blank document rate from the catalog defaultRate", () => {
    const row = { ...createEmptyHhaAuthorization(), rate: "" };
    const next = applyHhaCatalogIdentity(row, catalogService);
    expect(next.rate).toBe("6.67");
  });
});
