import { useMemo, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { createAgencyOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import { resolveEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import type { RootState } from "@/store/redux/store";
import { useAuth } from "@/utils/auth";
import FinancialOverviewPage from "./financial-overview";
import ClaimsDashboardPage from "./claims";
import PayrollDashboardPage from "./payroll";
import ExpensesDashboardPage from "./expenses";

function AgencyBillingScope({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const supportedClientTypes = user?.agency?.supportedClientTypes?.length
    ? user.agency.supportedClientTypes
    : (["ddd", "hha"] as const);
  const storedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const mode = resolveEffectiveAgencyMode(supportedClientTypes, storedMode);
  const data = useMemo(() => createAgencyOperationalDataAdapter(agencyId), [agencyId]);

  if (!agencyId) {
    return <p role="alert" className="px-4 py-8 text-sm text-[#808081]">Sign in again to manage billing.</p>;
  }

  return (
    <OperationalAgencyProvider
      actor="agency"
      agencyId={agencyId}
      agency={{
        id: agencyId,
        name: user?.agency?.name || user?.fullName || "Agency",
        status: "active",
        supportedClientTypes,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }}
      mode={mode}
      capabilities={{ canManageShifts: true, canManageBilling: true, shiftMaintenance: true }}
      data={data}
    >
      {children}
    </OperationalAgencyProvider>
  );
}

export function FinancialOverview() {
  return <AgencyBillingScope><FinancialOverviewPage /></AgencyBillingScope>;
}

export function PayrollManagement() {
  return <PayrollDashboardPage />;
}

export function ClaimsDashboard() {
  return <ClaimsDashboardPage />;
}

export function ExpensesDashboard() {
  return <ExpensesDashboardPage />;
}
