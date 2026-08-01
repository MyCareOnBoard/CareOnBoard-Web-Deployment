import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Loader2 } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import OperationalAgencySelector from "@/components/operational-agency/OperationalAgencySelector";
import { Button } from "@/components/ui/button";
import { getOperationalAgencyContext } from "@/lib/api/super-admin-operations";
import { createSuperAdminOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  createSuperAdminDirectoryRoutes,
  superAdminBillingRoutes,
} from "@/lib/operational-agency/routes";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { useAuth } from "@/utils/auth";

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

function billingSearch(search: string, agencyId?: string): string {
  const params = new URLSearchParams(search);
  params.delete("agencyId");
  if (agencyId) params.set("agencyId", agencyId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export default function SuperAdminBillingWorkspace() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const accessList = user?.profile?.accessList ?? [];
  const canManageBilling = accessList.includes("Billing Management");
  const requestedIds = useMemo(
    () => new URLSearchParams(location.search)
      .getAll("agencyId")
      .map((id) => id.trim())
      .filter(Boolean),
    [location.search],
  );
  const agencyId = requestedIds.length === 1 ? requestedIds[0] : "";
  const [resolvedAgency, setResolvedAgency] = useState<OperationalAgencySummary | null>(null);
  const [loading, setLoading] = useState(Boolean(agencyId));
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const data = useMemo(
    () => createSuperAdminOperationalDataAdapter("billing-management", agencyId),
    [agencyId],
  );
  const directoryRoutes = useMemo(
    () => createSuperAdminDirectoryRoutes(agencyId),
    [agencyId],
  );

  useEffect(() => {
    if (!canManageBilling || !agencyId) {
      setResolvedAgency(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setResolvedAgency(null);
    setLoading(true);
    setError(null);
    void getOperationalAgencyContext("billing-management", agencyId, controller.signal)
      .then((agency) => {
        if (agency.id !== agencyId) {
          throw new Error("Could not load this agency.");
        }
        if (!controller.signal.aborted) setResolvedAgency(agency);
      })
      .catch((loadError: unknown) => {
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
  }, [agencyId, canManageBilling, retryVersion]);

  if (!canManageBilling) {
    return (
      <p role="alert" className="px-4 py-8 text-sm font-medium text-[#7e3029]">
        You do not have Billing Management access.
      </p>
    );
  }

  const selectAgency = (selectedIds: string[]) => {
    const selectedAgencyId = selectedIds.length === 1 ? selectedIds[0] : "";
    const search = billingSearch(location.search, selectedAgencyId);
    navigate(selectedAgencyId
      ? superAdminBillingRoutes.financialOverview(search)
      : superAdminBillingRoutes.index(search));
  };

  const hasAmbiguousAgency = requestedIds.length > 1;
  const requestedMode = new URLSearchParams(location.search).get("clientType");
  const mode = resolvedAgency
    ? (requestedMode === "ddd" || requestedMode === "hha")
      && resolvedAgency.supportedClientTypes.includes(requestedMode)
      ? requestedMode
      : resolvedAgency.supportedClientTypes.length === 1
        ? resolvedAgency.supportedClientTypes[0]
        : null
    : null;

  return (
    <section className="min-w-0 space-y-6" aria-labelledby="billing-management-title">
      <div className="rounded-2xl border border-[#dce5e5] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(30,64,66,0.06)] sm:px-6">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#087f82]">Agency operations</p>
            <h1 id="billing-management-title" className="mt-1 text-2xl font-bold text-[#10141a] sm:text-3xl">
              Billing Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-[#687173]">
              Review one authorized agency&apos;s financial overview and billing operations.
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold text-[#3c4749]">Operational agency</p>
            <OperationalAgencySelector
              feature="billing-management"
              selectionMode="single"
              selectedIds={agencyId ? [agencyId] : []}
              onSelectionChange={selectAgency}
              initialAgencies={resolvedAgency ? [resolvedAgency] : undefined}
            />
          </div>
        </div>
      </div>

      {hasAmbiguousAgency ? (
        <p role="alert" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-sm font-medium text-[#7e3029]">
          Choose exactly one agency to manage billing.
        </p>
      ) : !agencyId ? (
        <div className="rounded-2xl border border-dashed border-[#cbd8d8] bg-[#f8fbfb] px-5 py-12 text-center">
          <Building2 aria-hidden className="mx-auto size-8 text-[#4e9193]" />
          <p className="mt-3 text-sm font-semibold text-[#263234]">Choose an agency to open its billing workspace.</p>
          <p className="mt-1 text-xs text-[#687173]">Only agencies assigned to your operational scope are available.</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center">
          <AlertTriangle className="mx-auto size-7 text-[#9a4038]" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-[#7e3029]">{error}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setRetryVersion((value) => value + 1)}>
            Try again
          </Button>
        </div>
      ) : loading || resolvedAgency?.id !== agencyId ? (
        <div className="flex min-h-64 items-center justify-center" aria-busy="true">
          <Loader2 className="size-7 animate-spin text-[#008f92]" aria-label="Loading agency" />
        </div>
      ) : (
        <OperationalAgencyProvider
          key={`${agencyId}:${resolvedAgency.id}`}
          actor="super_admin"
          agencyId={resolvedAgency.id}
          agency={resolvedAgency}
          mode={mode}
          capabilities={{
            canManageShifts: accessList.includes("Shift Management"),
            canManageBilling: true,
            shiftMaintenance: accessList.includes("Shift Maintenance"),
            canAccessClientDirectory: accessList.includes("Clients Directory"),
            canAccessStaffDirectory: accessList.includes("Staff Directory"),
          }}
          directoryRoutes={directoryRoutes}
          data={data}
        >
          <div className="min-w-0 space-y-6">
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dce5e5] bg-[#f8fbfb] px-4 py-3">
              <Building2 aria-hidden className="size-5 shrink-0 text-[#087f82]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#20282a]">{resolvedAgency.name}</p>
                <p className="truncate text-xs text-[#687173]">Billing workspace · {resolvedAgency.timezone}</p>
              </div>
            </div>
            <div className="min-w-0"><Outlet /></div>
          </div>
        </OperationalAgencyProvider>
      )}
    </section>
  );
}
