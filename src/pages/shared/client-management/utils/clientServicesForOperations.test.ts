import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import { getClientServicesForOperations } from "./clientServicesForOperations";

describe("getClientServicesForOperations", () => {
  it("returns API services when present (fast path)", () => {
    const cached = [{ id: "cached-1", code: "T1019", name: "PCA" }];
    const client = {
      type: "hha",
      services: cached,
      hhaAuthorizations: [{ id: "auth-1", serviceCode: "OTHER", serviceName: "Other" }],
    } as Client;

    expect(getClientServicesForOperations(client)).toEqual(cached);
  });

  it("falls back to HHA authorizations for wizard drafts", () => {
    const client = {
      type: "hha",
      hhaAuthorizations: [
        {
          id: "auth-1",
          serviceCode: "T1019",
          serviceName: "PCA",
          staffRate: "15",
          payType: "hourly",
          authorizationNumber: "PA-1",
        },
      ],
    } as Client;

    const services = getClientServicesForOperations(client);
    expect(services).toHaveLength(1);
    expect(services[0].code).toBe("T1019");
    expect(services[0].staffRate).toBe("15");
    expect(services[0].sdrPriorAuthorization?.paNumber).toBe("PA-1");
  });

  it("falls back to DDD outcomes when no services", () => {
    const client = {
      type: "ddd",
      outcomes: [
        {
          id: "o1",
          statement: "Goal",
          services: [{ id: "s1", code: "H2014", name: "Respite" }],
        },
      ],
    } as Client;

    const services = getClientServicesForOperations(client);
    expect(services).toHaveLength(1);
    expect(services[0].code).toBe("H2014");
  });
});
