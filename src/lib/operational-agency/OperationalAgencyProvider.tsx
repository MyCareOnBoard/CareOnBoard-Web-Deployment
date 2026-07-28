import { createContext, useContext } from "react";
import { agencyShiftRoutes, superAdminShiftRoutes } from "./routes";
import type {
  OperationalActor,
  OperationalAgencyContextValue,
  OperationalAgencyDataAdapter,
  OperationalAgencySummary,
  OperationalCapabilities,
} from "./types";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

const OperationalAgencyContext = createContext<OperationalAgencyContextValue | null>(null);

export interface OperationalAgencyProviderProps {
  children: React.ReactNode;
  actor: OperationalActor;
  agencyId: string;
  agency: OperationalAgencySummary;
  mode: AgencyMode | null;
  capabilities: OperationalCapabilities;
  data: OperationalAgencyDataAdapter;
}

export function OperationalAgencyProvider({
  children,
  actor,
  agencyId,
  agency,
  mode,
  capabilities,
  data,
}: OperationalAgencyProviderProps) {
  if (!agencyId) {
    throw new Error("OperationalAgencyProvider requires an agencyId.");
  }

  if (agency.id !== agencyId) {
    throw new Error("OperationalAgencyProvider agencyId must match agency.id.");
  }

  const value: OperationalAgencyContextValue = {
    actor,
    agencyId,
    agency,
    mode,
    routes: actor === "super_admin" ? superAdminShiftRoutes : agencyShiftRoutes,
    capabilities,
    data,
  };

  return (
    <OperationalAgencyContext.Provider value={value}>
      {children}
    </OperationalAgencyContext.Provider>
  );
}

export function useOperationalAgency(): OperationalAgencyContextValue {
  const context = useContext(OperationalAgencyContext);
  if (!context) {
    throw new Error("useOperationalAgency must be used within an OperationalAgencyProvider");
  }
  return context;
}
