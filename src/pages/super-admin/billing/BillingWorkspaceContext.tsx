import { createContext, useContext, type ReactNode } from "react";
import type {
  BillingWorkspaceDateRange,
  BillingWorkspaceState,
} from "./billingWorkspaceState";

export interface BillingWorkspaceContextValue extends BillingWorkspaceState {
  actorUid: string;
  environment: string;
  onDateRangeChange: (range: BillingWorkspaceDateRange) => void;
}

const BillingWorkspaceContext = createContext<BillingWorkspaceContextValue | null>(null);

export function BillingWorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BillingWorkspaceContextValue;
}) {
  return (
    <BillingWorkspaceContext.Provider value={value}>
      {children}
    </BillingWorkspaceContext.Provider>
  );
}

export function useBillingWorkspaceContext(): BillingWorkspaceContextValue {
  const value = useOptionalBillingWorkspaceContext();
  if (!value) {
    throw new Error("useBillingWorkspaceContext must be used within BillingWorkspaceProvider.");
  }
  return value;
}

export function useOptionalBillingWorkspaceContext(): BillingWorkspaceContextValue | null {
  return useContext(BillingWorkspaceContext);
}
