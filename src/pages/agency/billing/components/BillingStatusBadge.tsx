import type { BillingClaimStatus } from "@/lib/api/claims";
import { cn } from "@/lib/utils";
import { getClaimStatusLabel } from "../claims/utils/savedClaimUtils";
import {
  BILLING_STATUS_BADGE_BASE,
  getBillingStatusBadgeStyle,
  getClaimStatusBadgeColor,
  getPayrollStatusBadgeColor,
  type PayrollActivityStatus,
} from "./billingStatusTokens";

type BillingStatusBadgeProps = {
  className?: string;
} & (
  | { domain: "claim"; status: BillingClaimStatus }
  | { domain: "payroll"; status: PayrollActivityStatus }
);

export default function BillingStatusBadge({ domain, status, className }: BillingStatusBadgeProps) {
  const label = domain === "claim"
    ? getClaimStatusLabel(status)
    : status === "paid"
      ? "Paid"
      : status === "partially_paid"
        ? "Partially paid"
        : status === "failed"
          ? "Failed"
          : "In progress";
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
