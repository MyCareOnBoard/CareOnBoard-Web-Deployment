import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import {
  clientServicesForMileage,
  findActiveTransportationService,
  isTransportationClientService,
} from "./transportationClientService";

describe("transportationClientService", () => {
  it("detects DDD transportation services by code", () => {
    expect(
      isTransportationClientService({ id: "s1", name: "Transport", code: "T2003" }),
    ).toBe(true);
  });

  it("detects HHA S0215 mileage services by code and pay type", () => {
    expect(
      isTransportationClientService({
        id: "s1",
        name: "Non-Emergency Transportation - Mileage",
        code: "S0215",
      }),
    ).toBe(true);
    expect(
      isTransportationClientService({
        id: "s2",
        name: "Some Service",
        code: "X9999",
        clientPayType: "mile",
      }),
    ).toBe(true);
  });

  it("resolves an active transportation service from an HHA client's authorizations", () => {
    const client = {
      id: "client-hha",
      type: "hha",
      hhaAuthorizations: [
        {
          id: "auth-mile",
          serviceCode: "S0215",
          serviceName: "Non-Emergency Transportation - Mileage",
          unitType: "mile",
          staffRate: "0.67",
          payType: "mile",
          startDate: "2026-01-01",
          endDate: "2099-12-31",
        },
      ],
    } as Client;

    const services = clientServicesForMileage(client);
    const transport = findActiveTransportationService(services);
    expect(transport?.code).toBe("S0215");
    expect(transport?.clientPayType).toBe("mile");
  });

  it("returns null for HHA clients without a transportation authorization", () => {
    const client = {
      id: "client-hha",
      type: "hha",
      hhaAuthorizations: [
        {
          id: "auth-pca",
          serviceCode: "T1019",
          serviceName: "PCA",
          unitType: "15-min",
          staffRate: "14.00",
          payType: "hourly",
        },
      ],
    } as Client;

    expect(findActiveTransportationService(clientServicesForMileage(client))).toBeNull();
  });
});
