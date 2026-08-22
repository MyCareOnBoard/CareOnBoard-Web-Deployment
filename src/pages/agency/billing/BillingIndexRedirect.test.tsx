import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserType } from "@/utils/auth/types/user.types";
vi.mock("@/lib/operational-agency/routes", () => ({
  agencyBillingRoutes: { financialOverview: (search?: string) => `/agency/billing/financial-overview${search ?? ""}` },
}));
const state = vi.hoisted(() => ({ user: { userType: "agency_staff", profile: { accessList: ["Payroll Management"] } } as any }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, Navigate: ({ to }: any) => <span data-testid="navigate" data-to={to} />, useLocation: () => ({ search: "?agencyId=a1" }) };
});
import BillingIndexRedirect, { AgencyBillingIndexRedirect, getAgencyBillingIndexDestination } from "./BillingIndexRedirect";

describe("BillingIndexRedirect", () => {
  it("selects the first authorized agency child", () => {
    expect(getAgencyBillingIndexDestination(UserType.AGENCY_STAFF, ["Payroll Management"])).toBe("/agency/billing/payroll-management");
    expect(getAgencyBillingIndexDestination(UserType.AGENCY_STAFF, ["Payroll Approval"])).toBe("/agency/billing/payroll-management");
    expect(getAgencyBillingIndexDestination(UserType.AGENCY, [])).toBe("/agency/billing/financial-overview");
    expect(getAgencyBillingIndexDestination(UserType.AGENCY_STAFF, [])).toBe("/agency/dashboard");
  });
  it("keeps the generic redirect API for the Super Admin caller", () => {
    expect(BillingIndexRedirect).toBeTypeOf("function");
  });

  it("renders both redirect targets and preserves the generic query", () => {
    render(<BillingIndexRedirect search="?agencyId=a1" />);
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/agency/billing/financial-overview?agencyId=a1");
    render(<AgencyBillingIndexRedirect />);
    expect(screen.getAllByTestId("navigate")[1]).toHaveAttribute("data-to", "/agency/billing/payroll-management?agencyId=a1");
  });
});
