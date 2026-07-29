import { useMemo, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import { createAgencyOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import type { RootState } from "@/store/redux/store";
import { useAuth } from "@/utils/auth";
import SchedulingPage from ".";
import ShiftsListPage from "./shifts";
import ApprovalsPage from "./approvals";
import ActivityLogsPage from "./activity-logs";
import AgencyShiftDetailsPage from "@/pages/agency/shift-details";

function AgencyShiftOperationsScope({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const mode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]) ?? null;
  const data = useMemo(() => createAgencyOperationalDataAdapter(agencyId), [agencyId]);

  if (!agencyId) {
    return <p role="alert" className="px-4 py-8 text-sm text-[#808081]">Sign in again to manage shifts.</p>;
  }

  const supportedClientTypes = user?.agency?.supportedClientTypes?.length
    ? user.agency.supportedClientTypes
    : (["ddd", "hha"] as const);

  return (
    <OperationalAgencyProvider
      key={agencyId}
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

export function AgencySchedulingRoute() {
  return <AgencyShiftOperationsScope><SchedulingPage /></AgencyShiftOperationsScope>;
}

export function AgencyShiftsListRoute() {
  return <AgencyShiftOperationsScope><ShiftsListPage /></AgencyShiftOperationsScope>;
}

export function AgencyShiftApprovalsRoute() {
  return <AgencyShiftOperationsScope><ApprovalsPage /></AgencyShiftOperationsScope>;
}

export function AgencyShiftActivityLogsRoute() {
  return <AgencyShiftOperationsScope><ActivityLogsPage /></AgencyShiftOperationsScope>;
}

export function AgencyShiftDetailsRoute() {
  return <AgencyShiftOperationsScope><AgencyShiftDetailsPage /></AgencyShiftOperationsScope>;
}
