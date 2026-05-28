import { describe, expect, it } from "vitest";
import { getClientRate, getStaffRate } from "./billingUtils";
import type { ClientServiceDefinition } from "./api";

const baseService = (): ClientServiceDefinition => ({
  id: "s1",
  code: "H2021",
  name: "CBS",
  payType: "hourly",
});

describe("billingUtils rate helpers", () => {
  it("getClientRate uses clientRate only", () => {
    const svc = {
      ...baseService(),
      clientRate: "9.61",
      staffRate: "5.00",
    };
    expect(getClientRate(svc).rate).toBeCloseTo(9.61);
  });

  it("getClientRate returns 0 when clientRate missing", () => {
    const svc = { ...baseService(), staffRate: "25" };
    expect(getClientRate(svc).rate).toBe(0);
  });

  it("getStaffRate uses staffRate only", () => {
    const svc = {
      ...baseService(),
      staffRate: "18.50",
      clientRate: "9.61",
    };
    expect(getStaffRate(svc).rate).toBeCloseTo(18.5);
  });

  it("getStaffRate returns 0 when staffRate missing", () => {
    const svc = { ...baseService(), clientRate: "9.61" };
    expect(getStaffRate(svc).rate).toBe(0);
  });
});
