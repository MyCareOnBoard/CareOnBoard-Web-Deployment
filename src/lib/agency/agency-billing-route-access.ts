import { matchPath } from "react-router";
import { Routes } from "@/routes/constants";
import type { AgencyBillingScope } from "./agency-billing-permissions";

export const AGENCY_BILLING_MAIN_ROUTE_ACCESS = Object.freeze([
  { pattern: Routes.agency.billing.financialOverview, required: "Billing Overview" },
  { pattern: Routes.agency.billing.payrollManagement, required: "Payroll View" },
  { pattern: Routes.agency.billing.claims, required: "Claims View" },
  { pattern: Routes.agency.billing.expenses, required: "Expenses View" },
  { pattern: Routes.agency.billing.staffTimesheets, required: "Timesheets View" },
] as const satisfies readonly { pattern: string; required: AgencyBillingScope }[]);

export const AGENCY_BILLING_ROUTE_ACCESS = Object.freeze([
  ...AGENCY_BILLING_MAIN_ROUTE_ACCESS,
  { pattern: Routes.agency.billingAndApprovals, required: "Claims View" },
  { pattern: Routes.agency.clientClaims, required: "Claims View" },
  { pattern: Routes.agency.dspClaims, required: "Claims View" },
] as const satisfies readonly { pattern: string; required: AgencyBillingScope }[]);

export function getAgencyBillingRouteAccess(pathname: string) {
  return AGENCY_BILLING_ROUTE_ACCESS.find(({ pattern }) =>
    matchPath({ path: pattern, end: true }, pathname),
  );
}
