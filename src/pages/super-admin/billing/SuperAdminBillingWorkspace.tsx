import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { getOperationalAgencyContext } from "@/lib/api/super-admin-operations";
import { createSuperAdminOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import { createSuperAdminDirectoryRoutes } from "@/lib/operational-agency/routes";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { useAuth } from "@/utils/auth";
import BillingManagementHeader from "./BillingManagementHeader";
import {
  BillingWorkspaceProvider,
  type BillingWorkspaceContextValue,
} from "./BillingWorkspaceContext";
import BillingWorkspaceSkeleton from "./BillingWorkspaceSkeleton";
import {
  canonicalizeBillingWorkspaceSearch,
  parseBillingWorkspace,
  updateBillingWorkspaceDateRange,
  updateBillingWorkspaceMode,
  updateBillingWorkspaceScope,
  type BillingProgramMode,
  type BillingWorkspaceDateRange,
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

function AgencyBillingOutlet({
  accessList,
  agency,
  mode,
}: {
  accessList: readonly string[];
  agency: OperationalAgencySummary;
  mode: BillingProgramMode | null;
}) {
  const data = useMemo(
    () => createSuperAdminOperationalDataAdapter("billing-management", agency.id),
    [agency.id],
  );
  const directoryRoutes = useMemo(
    () => createSuperAdminDirectoryRoutes(agency.id),
    [agency.id],
  );
  const effectiveMode = mode && agency.supportedClientTypes.includes(mode)
    ? mode
    : agency.supportedClientTypes.length === 1
      ? agency.supportedClientTypes[0]
      : null;

  return (
    <OperationalAgencyProvider
      key={agency.id}
      actor="super_admin"
      agencyId={agency.id}
      agency={agency}
      mode={effectiveMode}
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
      <Outlet />
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
  context: BillingWorkspaceContextValue;
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
          <div className="min-w-0"><Outlet /></div>
        ) : resolvedAgency ? (
          <div className="min-w-0">
            <AgencyBillingOutlet accessList={accessList} agency={resolvedAgency} mode={context.mode} />
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

  useEffect(() => {
    if (!workspace) return;
    const canonicalSearch = canonicalizeBillingWorkspaceSearch(location.search);
    if (canonicalSearch !== location.search) {
      navigate({ pathname: location.pathname, search: canonicalSearch }, { replace: true });
    }
  }, [location.pathname, location.search, navigate, workspace]);

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

  const context: BillingWorkspaceContextValue = {
    ...workspace,
    actorUid,
    environment: apiEnvironment,
  };
  const navigateWithSearch = (search: string) => {
    navigate({ pathname: location.pathname, search });
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
      onDateRangeChange={(range) => navigateWithSearch(updateBillingWorkspaceDateRange(location.search, range))}
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
