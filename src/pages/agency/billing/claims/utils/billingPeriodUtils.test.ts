import { describe, expect, it } from "vitest";
import type { ClientService } from "@/lib/api/clients";
import { agencyPeriodBounds, resolveBillingPeriodLabel } from "./billingPeriodUtils";

describe("billingPeriodUtils", () => {
  it("matches the backend periods", () => {
    expect(agencyPeriodBounds("2026-10-21")).toEqual({ start: "2026-10-18", end: "2026-10-24" });
    expect(agencyPeriodBounds("2026-02-16", { billingPeriod: "semimonthly" })).toEqual({ start: "2026-02-16", end: "2026-02-28" });
    expect(agencyPeriodBounds("2028-02-20", { billingPeriod: "monthly" })).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(agencyPeriodBounds("2026-01-18", { billingPeriod: "biweekly" })).toEqual({ start: "2026-01-18", end: "2026-01-31" });
  });

  it("prefers the SDR week, then clips to the authorization", () => {
    const sdr = { sdrWeeklyDistribution: { rows: [{ weekRange: "4/7/2025 - 4/11/2025" }] } } as unknown as ClientService;
    expect(resolveBillingPeriodLabel("2025-04-08", sdr, { billingPeriod: "monthly" })).toBe("4/7/2025 - 4/11/2025");
    const auth = { startAuthDate: "2026-10-20", endAuthDate: "2026-10-22" } as unknown as ClientService;
    expect(resolveBillingPeriodLabel("2026-10-21", auth)).toBe("10/20/2026 - 10/22/2026");
    expect(resolveBillingPeriodLabel("2026-10-19", auth)).toBe("10/18/2026 - 10/24/2026");
    expect(resolveBillingPeriodLabel("", auth)).toBeNull();
  });
});
