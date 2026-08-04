import { createContext, useContext, type ReactNode } from "react";
import type {
  BillingWorkspaceDateRange,
  BillingPayrollTab,
  BillingWorkspaceState,
} from "./billingWorkspaceState";
import { normalizeNetworkPayrollWeekStart } from "./network/networkPayrollWeek";

type BillingWorkspaceContextState = Omit<BillingWorkspaceState, "payrollWeekStart" | "payrollTab">
  & Partial<Pick<BillingWorkspaceState, "payrollWeekStart" | "payrollTab">>;

export interface BillingWorkspaceContextValue extends BillingWorkspaceContextState {
  actorUid: string;
  environment: string;
  onDateRangeChange: (range: BillingWorkspaceDateRange) => void;
  onPayrollWeekChange?: (weekStart: string) => void;
  onPayrollTabChange?: (tab: BillingPayrollTab) => void;
}

export type ResolvedBillingWorkspaceContextValue = BillingWorkspaceContextValue & BillingWorkspaceState;

const BillingWorkspaceContext = createContext<ResolvedBillingWorkspaceContextValue | null>(null);

export function BillingWorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BillingWorkspaceContextValue;
}) {
  const resolvedValue: ResolvedBillingWorkspaceContextValue = {
    ...value,
    payrollWeekStart: value.payrollWeekStart
      ?? normalizeNetworkPayrollWeekStart("", value.endDate),
    payrollTab: value.payrollTab ?? "due",
    onPayrollWeekChange: value.onPayrollWeekChange ?? (() => undefined),
    onPayrollTabChange: value.onPayrollTabChange ?? (() => undefined),
  };

  return (
    <BillingWorkspaceContext.Provider value={resolvedValue}>
      {children}
    </BillingWorkspaceContext.Provider>
  );
}

export function useBillingWorkspaceContext(): ResolvedBillingWorkspaceContextValue {
  const value = useOptionalBillingWorkspaceContext();
  if (!value) {
    throw new Error("useBillingWorkspaceContext must be used within BillingWorkspaceProvider.");
  }
  return value;
}

export function useOptionalBillingWorkspaceContext(): ResolvedBillingWorkspaceContextValue | null {
  return useContext(BillingWorkspaceContext);
}
