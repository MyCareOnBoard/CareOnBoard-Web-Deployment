import { describe, expect, it } from "vitest";
import { UserType } from "@/utils/auth/types/user.types";
import {
  AGENCY_BILLING_SCOPES,
  canAccessBillingChild,
  canApprovePayroll,
  canManageEmployeePayroll,
} from "./agency-billing-permissions";

describe("agency billing permissions", () => {
  it("freezes the ten canonical scopes in display order", () => {
    expect(AGENCY_BILLING_SCOPES).toEqual([
      "Billing Overview", "Claims View", "Claims Management", "Payroll View", "Payroll Management",
      "Payroll Approval",
      "Expenses View", "Expenses Management", "Timesheets View", "Timesheets Approval",
    ]);
  });

  it("gives owners every scope and never recognizes the legacy scope", () => {
    for (const scope of AGENCY_BILLING_SCOPES) {
      expect(canAccessBillingChild(UserType.AGENCY, [], scope)).toBe(true);
    }
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Billing & Management"], "Payroll View")).toBe(false);
    expect(canAccessBillingChild(UserType.EMPLOYEE, ["Payroll View"], "Payroll View")).toBe(false);
  });

  it("only applies same-domain elevated implications", () => {
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Claims Management"], "Claims View")).toBe(true);
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Payroll Management"], "Payroll View")).toBe(true);
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Payroll Approval"], "Payroll View")).toBe(true);
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Expenses Management"], "Expenses View")).toBe(true);
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Timesheets Approval"], "Timesheets View")).toBe(true);
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Payroll Management"], "Claims View")).toBe(false);
    expect(canAccessBillingChild(UserType.AGENCY_STAFF, ["Payroll Approval"], "Claims View")).toBe(false);
  });

  it("limits managed employee payroll to owners and exact Payroll Management staff", () => {
    expect(canManageEmployeePayroll(UserType.AGENCY, [])).toBe(true);
    expect(canManageEmployeePayroll(UserType.AGENCY_STAFF, ["Payroll Management"])).toBe(true);
    expect(canManageEmployeePayroll(UserType.AGENCY_STAFF, ["Payroll View"])).toBe(false);
    expect(canManageEmployeePayroll(UserType.AGENCY_STAFF, ["Signer"])).toBe(false);
    expect(canManageEmployeePayroll(UserType.EMPLOYEE, ["Payroll Management"])).toBe(false);
  });

  it("requires owner authority or exact Payroll Approval for final approval", () => {
    expect(canApprovePayroll(UserType.AGENCY, [])).toBe(true);
    expect(canApprovePayroll(UserType.AGENCY_STAFF, ["Payroll Approval"])).toBe(true);
    expect(canApprovePayroll(UserType.AGENCY_STAFF, ["Payroll Management"])).toBe(false);
    expect(canApprovePayroll(UserType.AGENCY_STAFF, ["Payroll View"])).toBe(false);
    expect(canApprovePayroll(UserType.EMPLOYEE, ["Payroll Approval"])).toBe(false);
    expect(canApprovePayroll(UserType.SUPER_ADMIN, ["Billing Management", "Payroll Approval"])).toBe(false);
  });
});
