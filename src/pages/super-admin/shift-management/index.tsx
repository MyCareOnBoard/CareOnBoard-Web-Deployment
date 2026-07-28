import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { listOperationalAgencies } from "@/lib/api/super-admin-operations";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { Routes } from "@/routes/constants";
import ShiftManagementHeader from "./ShiftManagementHeader";
import SuperAdminShiftsCalendar from "./SuperAdminShiftsCalendar";
import {
  resolveInitialShiftWorkspace,
  transitionShiftWorkspaceView,
  updateShiftWorkspaceMonth,
  updateShiftWorkspaceSelection,
  type ShiftWorkspaceState,
} from "./shiftWorkspaceState";

const AGENCY_PAGE_LIMIT = 50;

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.name === "AbortError";
}

function activeSorted(agencies: Iterable<OperationalAgencySummary>): OperationalAgencySummary[] {
  return [...agencies]
    .filter((agency) => agency.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

export default function ShiftManagementWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<OperationalAgencySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      const agencyById = new Map<string, OperationalAgencySummary>();
      let cursor: string | undefined;
      try {
        do {
          const page = await listOperationalAgencies("shift-management", {
            cursor,
            limit: AGENCY_PAGE_LIMIT,
            signal: controller.signal,
          });
          if (!active) return;
          for (const agency of page.data) agencyById.set(agency.id, agency);
          cursor = page.nextCursor || undefined;
        } while (cursor);
        setAgencies(activeSorted(agencyById.values()));
      } catch (loadFailure) {
        if (!active || isAbort(loadFailure)) return;
        setError(loadFailure instanceof Error && loadFailure.message
          ? loadFailure.message
          : "Could not load your agencies.");
        setAgencies([]);
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [retryVersion]);

  const workspace = resolveInitialShiftWorkspace(location.search, agencies);
  const selectedIds = workspace.view === "calendar"
    ? workspace.agencyIds
    : workspace.agencyId ? [workspace.agencyId] : [];
  const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
  const selectedAgencies = selectedIds.flatMap((id) => {
    const agency = agencyById.get(id);
    return agency ? [agency] : [];
  });
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("clientType") === "hha" ? "hha" : "ddd";

  const navigateTo = (next: ShiftWorkspaceState, search: string) => {
    navigate({
      pathname: next.view === "list" ? Routes.superAdmin.shifts.list : Routes.superAdmin.shifts.index,
      search,
    });
  };

  const changeSelection = (ids: string[]) => {
    const transition = updateShiftWorkspaceSelection(location.search, workspace, ids);
    navigateTo(transition.state, transition.search);
  };

  const changeMonth = (month: string) => {
    const transition = updateShiftWorkspaceMonth(location.search, workspace, month);
    navigateTo(transition.state, transition.search);
  };

  const changeView = (view: ShiftWorkspaceState["view"]) => {
    const transition = transitionShiftWorkspaceView(location.search, workspace, view);
    if (!transition.requiresAgencyChoice) navigateTo(transition.state, transition.search);
  };

  if (loading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="text-center">
          <Loader2 aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-[#008f92]" />
          <p className="mt-3 text-sm font-semibold text-[#556768]">Loading shift workspace…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center" role="alert">
        <AlertTriangle aria-hidden="true" className="mx-auto h-7 w-7 text-[#9a4038]" />
        <p className="mt-2 text-sm font-semibold text-[#7e3029]">{error}</p>
        <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => setRetryVersion((value) => value + 1)}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <ShiftManagementHeader
        view={workspace.view}
        month={workspace.month}
        selectedAgencyIds={selectedIds}
        onViewChange={changeView}
        onMonthChange={changeMonth}
        onAgencySelectionChange={changeSelection}
      />

      {workspace.view === "calendar" ? (
        <SuperAdminShiftsCalendar
          agencies={selectedAgencies}
          month={workspace.month}
          mode={mode}
          onMonthChange={changeMonth}
          onSelectionChange={changeSelection}
        />
      ) : null}
    </div>
  );
}
