import { describe, expect, it } from "vitest";
import type { Client, ClientHhaAuthorization } from "@/lib/api/clients";
import {
  getClientServicesForOperations,
  hhaAuthorizationToClientService,
} from "./clientServicesForOperations";

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

// parity: see docs/superpowers/specs/2026-06-10-hha-downstream-gaps-design.md —
// these fixture cases are mirrored in the backend client-services-normalize tests.
describe("HHA normalization parity fixtures", () => {
  const baseAuth: ClientHhaAuthorization = {
    id: "auth-pdn",
    authorizationNumber: "PA-777",
    serviceName: "Private Duty Nursing RN",
    serviceCode: "T1002",
    approvedHours: "40",
    payerSource: "Aetna",
    rate: "9.25",
    staffRate: "30.00",
    startDate: "2026-02-01",
    endDate: "2026-08-01",
  };

  function normalizeOne(auth: ClientHhaAuthorization) {
    const svc = hhaAuthorizationToClientService(auth);
    if (!svc) throw new Error("expected a normalized service");
    return svc;
  }

  it("preserves modifier from the authorization", () => {
    const svc = normalizeOne({ ...baseAuth, modifier: "UA", unitType: "15-min" });
    expect(svc.modifier).toBe("UA");
  });

  it("omits modifier when absent or blank", () => {
    expect(normalizeOne({ ...baseAuth, unitType: "15-min" }).modifier).toBeUndefined();
    expect(
      normalizeOne({ ...baseAuth, modifier: "  ", unitType: "15-min" }).modifier,
    ).toBeUndefined();
  });

  it("derives payType from unitType when payType is blank", () => {
    expect(normalizeOne({ ...baseAuth, unitType: "15-min" }).payType).toBe("15-min");
    expect(normalizeOne({ ...baseAuth, unitType: "daily" }).payType).toBe("daily");
    expect(normalizeOne({ ...baseAuth, unitType: "hourly" }).payType).toBe("hourly");
    expect(normalizeOne({ ...baseAuth, unitType: "mile" }).payType).toBe("mile");
  });

  it("explicit payType wins over unitType derivation", () => {
    const svc = normalizeOne({ ...baseAuth, unitType: "15-min", payType: "hourly" });
    expect(svc.payType).toBe("hourly");
  });

  it("leaves payType undefined when neither payType nor unitType is set", () => {
    expect(normalizeOne({ ...baseAuth }).payType).toBeUndefined();
  });

  it("carries serviceType and serviceGoal from the authorization", () => {
    const svc = normalizeOne({
      ...baseAuth,
      serviceType: "Personal Care",
      goal: "Maintain independence at home",
    });
    expect(svc.serviceType).toBe("Personal Care");
    expect(svc.serviceGoal).toBe("Maintain independence at home");
  });

  it("omits serviceType and serviceGoal when absent or blank", () => {
    const svc = normalizeOne({ ...baseAuth, serviceType: "  ", goal: "" });
    expect(svc.serviceType).toBeUndefined();
    expect(svc.serviceGoal).toBeUndefined();
  });
});
