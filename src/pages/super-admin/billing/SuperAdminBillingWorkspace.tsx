import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { getOperationalAgencyContext } from "@/lib/api/super-admin-operations";
import { createSuperAdminOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import { createSuperAdminDirectoryRoutes } from "@/lib/operational-agency/routes";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import BillingManagementHeader from "./BillingManagementHeader";
import {
  BillingWorkspaceProvider,
  type BillingWorkspaceContextValue,
  type ResolvedBillingWorkspaceContextValue,
  useBillingWorkspaceContext,
} from "./BillingWorkspaceContext";
import BillingWorkspaceSkeleton from "./BillingWorkspaceSkeleton";
import {
  billingWorkspaceGeneration,
  canonicalizeBillingWorkspaceSearch,
  parseBillingWorkspace,
  updateBillingWorkspaceDateRange,
  updateBillingWorkspaceMode,
  updateBillingWorkspaceScope,
  type BillingProgramMode,
  type BillingWorkspaceDateRange,
  type BillingWorkspaceState,
} from "./billingWorkspaceState";
import type { BillingWorkspaceScope } from "./types";

const apiEnvironment = import.meta.env.VITE_API_ENVIRONMENT || "staging";

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

function rememberAgencies(
  current: readonly OperationalAgencySummary[],
  incoming: readonly OperationalAgencySummary[],
): OperationalAgencySummary[] {
  return [...new Map([...current, ...incoming].map((agency) => [agency.id, agency])).values()]
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

function normalizeAgencyWorkspace(
  workspace: BillingWorkspaceState,
  agency: OperationalAgencySummary | null,
): BillingWorkspaceState {
  if (workspace.scope.kind !== "agency" || agency?.id !== workspace.scope.agencyId) {
    return workspace;
  }
  const mode = workspace.mode && agency.supportedClientTypes.includes(workspace.mode)
    ? workspace.mode
    : agency.supportedClientTypes.length === 1
      ? agency.supportedClientTypes[0]
      : null;
  return mode === workspace.mode ? workspace : { ...workspace, mode };
}

function NetworkBillingBridge() {
  const workspace = useBillingWorkspaceContext();
  return (
    <section
      aria-label="Network billing workspace"
      data-scope={workspace.scope.kind}
      data-mode={workspace.mode ?? "all"}
      data-date-range={`${workspace.startDate}:${workspace.endDate}`}
      className="rounded-2xl border border-dashed border-[#cbd8d8] bg-[#f8fbfb] px-5 py-8"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f7778]">Network scope</p>
      <h2 className="mt-1 text-lg font-semibold text-[#20282a]">All authorized agencies</h2>
      <p className="mt-2 max-w-2xl text-sm text-[#687173]">
        Network billing totals for this date range are being prepared. Agency billing remains available from the scope selector.
      </p>
    </section>
  );
}

function NetworkBillingOutlet() {
  const location = useLocation();
  const workspace = useBillingWorkspaceContext();
  const generation = billingWorkspaceGeneration(workspace);
  const pathname = location.pathname.replace(/\/+$/, "") || "/";

  return pathname === Routes.superAdmin.billing.financialOverview
    || pathname === Routes.superAdmin.billing.claims
    || pathname === Routes.superAdmin.billing.payrollManagement
    || pathname === Routes.superAdmin.billing.expenses
    || pathname === Routes.superAdmin.billing.staffTimesheets
    ? <Outlet key={generation} />
    : <NetworkBillingBridge />;
}

function AgencyBillingOutlet({
  accessList,
  agency,
  workspace,
}: {
  accessList: readonly string[];
  agency: OperationalAgencySummary;
  workspace: BillingWorkspaceState;
}) {
  const data = useMemo(
    () => createSuperAdminOperationalDataAdapter("billing-management", agency.id),
    [agency.id],
  );
  const directoryRoutes = useMemo(
    () => createSuperAdminDirectoryRoutes(agency.id),
    [agency.id],
  );
  const generation = billingWorkspaceGeneration(workspace);

  return (
    <OperationalAgencyProvider
      key={agency.id}
      actor="super_admin"
      agencyId={agency.id}
      agency={agency}
      mode={workspace.mode}
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
      <Outlet key={generation} />
    </OperationalAgencyProvider>
  );
}

function WorkspaceFrame({
  accessList,
  agencies,
  context,
  error,
  onAgenciesDiscovered,
  onDateRangeChange,
  onModeChange,
  onRetry,
  onScopeChange,
  resolvedAgency,
  search,
}: {
  accessList: readonly string[];
  agencies: OperationalAgencySummary[];
  context: ResolvedBillingWorkspaceContextValue;
  error: string | null;
  onAgenciesDiscovered: (agencies: OperationalAgencySummary[]) => void;
  onDateRangeChange: (range: BillingWorkspaceDateRange) => void;
  onModeChange: (mode: BillingProgramMode | null) => void;
  onRetry: () => void;
  onScopeChange: (scope: BillingWorkspaceScope) => void;
  resolvedAgency: OperationalAgencySummary | null;
  search: string;
}) {
  return (
    <BillingWorkspaceProvider value={context}>
      <section className="min-w-0 space-y-5 pb-6" aria-labelledby="billing-management-title">
        <BillingManagementHeader
          workspace={context}
          search={search}
          onScopeChange={onScopeChange}
          onDateRangeChange={onDateRangeChange}
          onModeChange={onModeChange}
          initialAgencies={agencies.length ? agencies : undefined}
          onAgenciesDiscovered={onAgenciesDiscovered}
        />

        {error ? (
          <div role="alert" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center">
            <AlertTriangle className="mx-auto size-7 text-[#9a4038]" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-[#7e3029]">{error}</p>
            <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : context.scope.kind === "network" ? (
          <div className="min-w-0"><NetworkBillingOutlet /></div>
        ) : resolvedAgency ? (
          <div className="min-w-0">
            <AgencyBillingOutlet accessList={accessList} agency={resolvedAgency} workspace={context} />
          </div>
        ) : null}
      </section>
    </BillingWorkspaceProvider>
  );
}

function AuthorizedBillingWorkspace({
  accessList,
  actorUid,
}: {
  accessList: readonly string[];
  actorUid: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const parsed = useMemo(() => {
    try {
      return { workspace: parseBillingWorkspace(location.search), error: null };
    } catch (error) {
      return {
        workspace: null,
        error: error instanceof Error ? error.message : "Could not open billing management.",
      };
    }
  }, [location.search]);
  const workspace = parsed.workspace;
  const agencyId = workspace?.scope.kind === "agency" ? workspace.scope.agencyId : "";
  const [resolvedAgency, setResolvedAgency] = useState<OperationalAgencySummary | null>(null);
  const [knownAgencies, setKnownAgencies] = useState<OperationalAgencySummary[]>([]);
  const [loading, setLoading] = useState(Boolean(agencyId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [operationalContextRevision, setOperationalContextRevision] = useState(0);

  useEffect(() => {
    if (!agencyId) {
      setResolvedAgency(null);
      setLoading(false);
      setLoadError(null);
      return;
    }

    const controller = new AbortController();
    setResolvedAgency(null);
    setLoading(true);
    setLoadError(null);
    void getOperationalAgencyContext("billing-management", agencyId, controller.signal)
      .then((agency) => {
        if (agency.id !== agencyId) throw new Error("Could not load this agency.");
        if (!controller.signal.aborted) {
          setResolvedAgency(agency);
          setOperationalContextRevision((current) => current + 1);
          setKnownAgencies((current) => rememberAgencies(current, [agency]));
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbort(error)) {
          setLoadError(error instanceof Error && error.message
            ? error.message
            : "Could not load this agency.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [agencyId, retryVersion]);

  const onAgenciesDiscovered = useCallback((agencies: OperationalAgencySummary[]) => {
    setKnownAgencies((current) => rememberAgencies(current, agencies));
  }, []);

  const normalizedWorkspace = useMemo(
    () => workspace ? normalizeAgencyWorkspace(workspace, resolvedAgency) : null,
    [resolvedAgency, workspace],
  );

  useEffect(() => {
    if (!workspace || !normalizedWorkspace) return;
    let canonicalSearch = canonicalizeBillingWorkspaceSearch(location.search);
    if (normalizedWorkspace.mode !== workspace.mode) {
      canonicalSearch = updateBillingWorkspaceMode(canonicalSearch, normalizedWorkspace.mode);
    }
    if (canonicalSearch !== location.search) {
      navigate({ pathname: location.pathname, search: canonicalSearch }, { replace: true });
    }
  }, [location.pathname, location.search, navigate, normalizedWorkspace, workspace]);

  if (!workspace) {
    return (
      <p role="alert" className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-sm font-medium text-[#7e3029]">
        {parsed.error}
      </p>
    );
  }

  if (loading || (agencyId && !loadError && resolvedAgency?.id !== agencyId)) {
    return <BillingWorkspaceSkeleton />;
  }

  const activeWorkspace = normalizedWorkspace ?? workspace;
  const navigateWithSearch = (search: string) => {
    navigate({ pathname: location.pathname, search });
  };
  const onDateRangeChange = (range: BillingWorkspaceDateRange) => {
    navigateWithSearch(updateBillingWorkspaceDateRange(location.search, range));
  };
  const context: ResolvedBillingWorkspaceContextValue & { operationalContextRevision: number } = {
    ...activeWorkspace,
    actorUid,
    environment: apiEnvironment,
    operationalContextRevision,
    onDateRangeChange,
  };

  return (
    <WorkspaceFrame
      accessList={accessList}
      agencies={knownAgencies}
      context={context}
      error={loadError}
      resolvedAgency={resolvedAgency}
      search={location.search}
      onAgenciesDiscovered={onAgenciesDiscovered}
      onRetry={() => setRetryVersion((value) => value + 1)}
      onScopeChange={(scope) => navigateWithSearch(updateBillingWorkspaceScope(location.search, scope))}
      onDateRangeChange={onDateRangeChange}
      onModeChange={(mode) => navigateWithSearch(updateBillingWorkspaceMode(location.search, mode))}
    />
  );
}

export default function SuperAdminBillingWorkspace() {
  const { user } = useAuth();
  const accessList = user?.profile?.accessList ?? [];
  if (!accessList.includes("Billing Management")) {
    return (
      <p role="alert" className="px-4 py-8 text-sm font-medium text-[#7e3029]">
        You do not have Billing Management access.
      </p>
    );
  }

  return <AuthorizedBillingWorkspace accessList={accessList} actorUid={user?.uid ?? ""} />;
}
