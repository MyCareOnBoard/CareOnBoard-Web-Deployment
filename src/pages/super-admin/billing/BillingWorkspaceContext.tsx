import { createContext, useContext, type ReactNode } from "react";
import type { BillingWorkspaceState } from "./billingWorkspaceState";

export interface BillingWorkspaceContextValue extends BillingWorkspaceState {
  actorUid: string;
  environment: string;
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
  const value = useContext(BillingWorkspaceContext);
  if (!value) {
    throw new Error("useBillingWorkspaceContext must be used within BillingWorkspaceProvider.");
  }
  return value;
}
