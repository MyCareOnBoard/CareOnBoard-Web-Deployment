import { describe, expect, it, vi } from "vitest";
import { Routes } from "./constants";
import { preloadDirectAgencyPayrollRoute } from "./preloadDirectPayrollRoute";

describe("preloadDirectAgencyPayrollRoute", () => {
  it("warms the agency payroll page on a direct payroll load", () => {
    const load = vi.fn(() => Promise.resolve());

    preloadDirectAgencyPayrollRoute(
      Routes.agency.billing.payrollManagement,
      load,
    );

    expect(load).toHaveBeenCalledOnce();
  });

  it("does not warm payroll code for unrelated routes", () => {
    const load = vi.fn(() => Promise.resolve());

    preloadDirectAgencyPayrollRoute(Routes.agency.dashboard, load);

    expect(load).not.toHaveBeenCalled();
  });
});
