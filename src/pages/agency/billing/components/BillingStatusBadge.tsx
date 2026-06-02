import type { BillingClaimStatus } from "@/lib/api/claims";
import type { PayrollInvoiceStatus } from "@/lib/api/payroll";
import { cn } from "@/lib/utils";
import { getClaimStatusLabel } from "../claims/utils/savedClaimUtils";
import { getPayrollStatusLabel } from "../payroll/utils/payrollDashboardUtils";
import {
  BILLING_STATUS_BADGE_BASE,
  getBillingStatusBadgeStyle,
  getClaimStatusBadgeColor,
  getPayrollStatusBadgeColor,
} from "./billingStatusTokens";

type BillingStatusBadgeProps = {
  className?: string;
} & (
  | { domain: "claim"; status: BillingClaimStatus }
  | { domain: "payroll"; status: PayrollInvoiceStatus }
);

export default function BillingStatusBadge({ domain, status, className }: BillingStatusBadgeProps) {
  const label = domain === "claim" ? getClaimStatusLabel(status) : getPayrollStatusLabel(status);
  const accentColor =
    domain === "claim" ? getClaimStatusBadgeColor(status) : getPayrollStatusBadgeColor(status);

  return (
    <span
      className={cn(BILLING_STATUS_BADGE_BASE, className)}
      style={getBillingStatusBadgeStyle(accentColor)}
    >
      {label}
    </span>
  );
}
