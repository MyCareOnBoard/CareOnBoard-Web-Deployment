import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { getOperationalAgencyContext } from "@/lib/api/super-admin-operations";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import { createSuperAdminOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { useAuth } from "@/utils/auth";
import ShiftsListPage from "@/pages/agency/scheduling/shifts";
import ApprovalsPage from "@/pages/agency/scheduling/approvals";
import ActivityLogsPage from "@/pages/agency/scheduling/activity-logs";

interface SuperAdminShiftScopeProps {
  children: ReactNode;
  agency?: OperationalAgencySummary;
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

export function SuperAdminShiftScope({ children, agency: suppliedAgency }: SuperAdminShiftScopeProps) {
  const location = useLocation();
  const { user } = useAuth();
  const accessList = user?.profile?.accessList ?? [];
  const canManageShifts = accessList.includes("Shift Management");
  const requestedIds = new URLSearchParams(location.search)
    .getAll("agencyId")
    .map((id) => id.trim())
    .filter(Boolean);
  const agencyId = suppliedAgency?.id || (requestedIds.length === 1 ? requestedIds[0] : "");
  const [resolvedAgency, setResolvedAgency] = useState<OperationalAgencySummary | null>(suppliedAgency ?? null);
  const [loading, setLoading] = useState(!suppliedAgency);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!canManageShifts || !agencyId) {
      setLoading(false);
      setResolvedAgency(null);
      return;
    }
    if (suppliedAgency?.id === agencyId) {
      setResolvedAgency(suppliedAgency);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResolvedAgency(null);
    void getOperationalAgencyContext("shift-management", agencyId, controller.signal)
      .then((nextAgency) => {
        if (!controller.signal.aborted) setResolvedAgency(nextAgency);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted && !isAbort(loadError)) {
          setError(loadError instanceof Error && loadError.message
            ? loadError.message
            : "Could not load this agency.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [agencyId, canManageShifts, retryVersion, suppliedAgency]);

  const data = useMemo(
    () => createSuperAdminOperationalDataAdapter("shift-management", agencyId),
    [agencyId],
  );

  if (!canManageShifts) {
    return <p role="alert" className="px-4 py-8 text-sm font-medium text-[#7e3029]">You do not have Shift Management access.</p>;
  }
  if (!agencyId || (!suppliedAgency && requestedIds.length !== 1)) {
    return <p role="alert" className="px-4 py-8 text-sm font-medium text-[#808081]">Choose exactly one agency to manage shifts.</p>;
  }
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center">
        <AlertTriangle className="mx-auto size-7 text-[#9a4038]" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-[#7e3029]">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setRetryVersion((value) => value + 1)}>Try again</Button>
      </div>
    );
  }
  if (loading || resolvedAgency?.id !== agencyId) {
    return (
      <div className="flex min-h-64 items-center justify-center" aria-busy="true">
        <Loader2 className="size-7 animate-spin text-[#008f92]" aria-label="Loading agency" />
      </div>
    );
  }
  if (!resolvedAgency) {
    return <p role="alert" className="px-4 py-8 text-sm font-medium text-[#7e3029]">Could not load this agency.</p>;
  }

  const requestedMode = new URLSearchParams(location.search).get("clientType");
  const mode = (requestedMode === "ddd" || requestedMode === "hha")
    && resolvedAgency.supportedClientTypes.includes(requestedMode)
    ? requestedMode
    : resolvedAgency.supportedClientTypes[0] ?? null;

  return (
    <OperationalAgencyProvider
      key={`${agencyId}:${resolvedAgency.id}`}
      actor="super_admin"
      agencyId={resolvedAgency.id}
      agency={resolvedAgency}
      mode={mode}
      capabilities={{
        canManageShifts: true,
        canManageBilling: accessList.includes("Billing Management"),
        shiftMaintenance: accessList.includes("Shift Maintenance"),
      }}
      data={data}
    >
      {children}
    </OperationalAgencyProvider>
  );
}

export default function SuperAdminShiftList({ agency }: { agency?: OperationalAgencySummary }) {
  return <SuperAdminShiftScope agency={agency}><ShiftsListPage /></SuperAdminShiftScope>;
}

export function SuperAdminShiftApprovals() {
  return <SuperAdminShiftScope><ApprovalsPage /></SuperAdminShiftScope>;
}

export function SuperAdminShiftActivityLogs() {
  return <SuperAdminShiftScope><ActivityLogsPage /></SuperAdminShiftScope>;
}
