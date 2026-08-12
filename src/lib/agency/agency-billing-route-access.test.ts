import { describe, expect, it } from "vitest";
import { AGENCY_BILLING_ROUTE_ACCESS, getAgencyBillingRouteAccess } from "./agency-billing-route-access";

describe("agency billing route access", () => {
  it("maps all direct billing paths with exact matching", () => {
    expect(AGENCY_BILLING_ROUTE_ACCESS).toHaveLength(8);
    for (const [pathname, required] of [
      ["/agency/billing/financial-overview", "Billing Overview"],
      ["/agency/billing/payroll-management", "Payroll View"],
      ["/agency/billing/claims", "Claims View"],
      ["/agency/billing/expenses", "Expenses View"],
      ["/agency/billing/staff-timesheets", "Timesheets View"],
      ["/agency/billing-and-approvals", "Claims View"],
      ["/agency/billing-and-approvals/client/client-1", "Claims View"],
      ["/agency/billing-and-approvals/dsp/dsp-1", "Claims View"],
    ]) expect(getAgencyBillingRouteAccess(pathname)?.required).toBe(required);
    expect(getAgencyBillingRouteAccess("/agency/billing/claims/more")).toBeUndefined();
    expect(getAgencyBillingRouteAccess("/agency/billing/payroll-management-more")).toBeUndefined();
  });
});
