import { describe, expect, it } from "vitest";
import { DollarSign } from "lucide-react";
import { isNavGroupActive, resolveActiveNavPath } from "./nav-utils";
import type { NavItem } from "@/components/DashboardSidebar";

const billingItem: NavItem = {
  label: "Billing Management",
  path: "/super-admin/billing",
  icon: DollarSign,
  children: [
    {
      label: "Payroll management",
      path: "/super-admin/billing/payroll-management?agencyId=agency-123",
    },
  ],
};

describe("super-admin billing navigation", () => {
  it("keeps a query-preserving child active on its matching route", () => {
    expect(resolveActiveNavPath("/super-admin/billing/payroll-management", [billingItem]))
      .toBe("/super-admin/billing/payroll-management?agencyId=agency-123");
    expect(isNavGroupActive("/super-admin/billing/payroll-management", billingItem)).toBe(true);
  });
});
