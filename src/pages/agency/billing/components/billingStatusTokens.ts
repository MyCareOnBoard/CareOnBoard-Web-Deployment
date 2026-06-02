import type { CSSProperties } from "react";
import { CLAIMS_STATUS_COLORS } from "../claims/utils/claimsDashboardUtils";
import type { BillingClaimStatus } from "@/lib/api/claims";
import type { PayrollInvoiceStatus } from "@/lib/api/payroll";

export const BILLING_STATUS_BADGE_BASE =
  "inline-flex w-fit shrink-0 items-center justify-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold leading-tight tracking-tight whitespace-nowrap";

/** Matches claims dashboard badge tint: accent text + ~10% fill + ~35% border. */
export function getBillingStatusBadgeStyle(accentColor: string): CSSProperties {
  return {
    color: accentColor,
    borderColor: `${accentColor}59`,
    backgroundColor: `${accentColor}1a`,
  };
}

export function getClaimStatusBadgeColor(status: BillingClaimStatus): string {
  return CLAIMS_STATUS_COLORS[status];
}

/** Payroll pending/paid use the same palette as claims dashboard status colors. */
export function getPayrollStatusBadgeColor(status: PayrollInvoiceStatus): string {
  return status === "paid" ? CLAIMS_STATUS_COLORS.paid : CLAIMS_STATUS_COLORS.pending;
}
