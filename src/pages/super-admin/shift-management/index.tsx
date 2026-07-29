import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { listOperationalAgencies } from "@/lib/api/super-admin-operations";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { Routes } from "@/routes/constants";
import { superAdminShiftRoutes } from "@/lib/operational-agency/routes";
import ShiftManagementHeader from "./ShiftManagementHeader";
import SuperAdminShiftsCalendar from "./SuperAdminShiftsCalendar";
import {
  resolveInitialShiftWorkspace,
  transitionShiftWorkspaceView,
  updateShiftWorkspaceMonth,
  updateShiftWorkspaceSelection,
  type ShiftWorkspaceState,
} from "./shiftWorkspaceState";
import type { NormalizedCalendarShift } from "./calendarModel";

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
  const [scanLimit, setScanLimit] = useState<number | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [requiresAgencyChoice, setRequiresAgencyChoice] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      const agencyById = new Map<string, OperationalAgencySummary>();
      try {
        const requestedIds = Array.from(new Set(
          new URLSearchParams(location.search).getAll("agencyIds").filter(Boolean),
        ));
        let discoveredScanLimit: number | null = null;
        const hydrateRequested = async () => {
          for (let start = 0; start < requestedIds.length; start += AGENCY_PAGE_LIMIT) {
            const ids = requestedIds.slice(start, start + AGENCY_PAGE_LIMIT);
            const page = await listOperationalAgencies("shift-management", {
              ids,
              limit: ids.length,
              signal: controller.signal,
            });
            const requested = new Set(ids);
            for (const agency of page.data) {
              if (requested.has(agency.id)) agencyById.set(agency.id, agency);
            }
          }
        };
        const scanAllowed = async () => {
          const seenCursors = new Set<string>();
          let cursor: string | undefined;
          do {
            const page = await listOperationalAgencies("shift-management", {
              cursor,
              limit: AGENCY_PAGE_LIMIT,
              signal: controller.signal,
            });
            for (const agency of page.data) agencyById.set(agency.id, agency);
            if (page.truncated) discoveredScanLimit = page.scanLimit;
            const nextCursor = page.nextCursor || undefined;
            if (nextCursor && seenCursors.has(nextCursor)) throw new Error("Repeated agency cursor.");
            if (nextCursor) seenCursors.add(nextCursor);
            cursor = nextCursor;
          } while (cursor);
        };
        await Promise.all([hydrateRequested(), scanAllowed()]);
        if (!active) return;
        setAgencies(activeSorted(agencyById.values()));
        setScanLimit(discoveredScanLimit);
      } catch (loadFailure) {
        if (!active || isAbort(loadFailure)) return;
        setError(loadFailure instanceof Error && loadFailure.message
          ? loadFailure.message
          : "Could not load your agencies.");
        setAgencies([]);
        setScanLimit(null);
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

  const isCalendarRoute = location.pathname === Routes.superAdmin.shifts.index;
  const workspaceSearch = isCalendarRoute
    ? location.search
    : (() => {
      const params = new URLSearchParams(location.search);
      params.set("view", "list");
      return `?${params.toString()}`;
    })();
  const workspace = resolveInitialShiftWorkspace(workspaceSearch, agencies);
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
    setRequiresAgencyChoice(false);
    const transition = updateShiftWorkspaceSelection(location.search, workspace, ids);
    navigateTo(transition.state, transition.search);
  };

  const changeMonth = (month: string) => {
    const transition = updateShiftWorkspaceMonth(location.search, workspace, month);
    navigateTo(transition.state, transition.search);
  };

  const changeView = (view: ShiftWorkspaceState["view"]) => {
    const transition = transitionShiftWorkspaceView(location.search, workspace, view);
    setRequiresAgencyChoice(transition.requiresAgencyChoice);
    if (!transition.requiresAgencyChoice) navigateTo(transition.state, transition.search);
  };

  const openCalendarShift = (shift: NormalizedCalendarShift) => {
    const params = new URLSearchParams({
      agencyId: shift.agencyId,
      returnTo: `${location.pathname}${location.search}`,
    });
    navigate(superAdminShiftRoutes.details(shift.id, params.toString()));
  };

  const singularSearch = () => {
    const params = new URLSearchParams(location.search);
    params.delete("agencyIds");
    if (selectedIds.length === 1) params.set("agencyId", selectedIds[0]);
    else params.delete("agencyId");
    params.set("month", workspace.month);
    params.set("view", "list");
    return `?${params.toString()}`;
  };

  const openSection = (pathname: string) => {
    if (pathname !== Routes.superAdmin.shifts.index && selectedIds.length !== 1) {
      setRequiresAgencyChoice(true);
      return;
    }
    if (pathname === Routes.superAdmin.shifts.index) {
      const transition = transitionShiftWorkspaceView(location.search, workspace, "calendar");
      navigate({ pathname, search: transition.search });
      return;
    }
    navigate({ pathname, search: singularSearch() });
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
        initialAgencies={agencies}
        requiresAgencyChoice={requiresAgencyChoice}
      />

      <nav
        aria-label="Shift workspace sections"
        className="flex flex-wrap gap-2 rounded-xl border border-[#dce3e3] bg-white/70 p-2"
      >
        {[
          ["Calendar", Routes.superAdmin.shifts.index],
          ["Shift list", Routes.superAdmin.shifts.list],
          ["Approvals", Routes.superAdmin.shifts.approvals],
          ["Activity logs", Routes.superAdmin.shifts.activityLogs],
        ].map(([label, pathname]) => {
          const active = location.pathname === pathname;
          const disabled = pathname !== Routes.superAdmin.shifts.index && selectedIds.length !== 1;
          return (
            <button
              key={pathname}
              type="button"
              aria-current={active ? "page" : undefined}
              disabled={disabled}
              onClick={() => openSection(pathname)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors ${active
                ? "bg-[#075b5d] text-white"
                : "text-[#4d5a5c] hover:bg-[#edf5f5] disabled:cursor-not-allowed disabled:opacity-50"}`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {scanLimit ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Agency discovery was limited to {scanLimit} records. Your selected agencies were checked directly.
        </p>
      ) : null}

      {selectedAgencies.length === 1 ? (
        <div
          role="status"
          aria-label="Selected operational agency"
          className="rounded-xl border border-[#b9dfe0] bg-[#eefafa] px-4 py-3 text-sm text-[#234f50]"
        >
          Operating in <strong>{selectedAgencies[0].name}</strong>
        </div>
      ) : null}

      {isCalendarRoute && workspace.view === "calendar" ? (
        <SuperAdminShiftsCalendar
          agencies={selectedAgencies}
          month={workspace.month}
          mode={mode}
          onMonthChange={changeMonth}
          onSelectionChange={changeSelection}
          onOpenShift={openCalendarShift}
        />
      ) : null}

      {!isCalendarRoute ? <Outlet /> : null}
    </div>
  );
}

export function SuperAdminShiftWorkspaceIndex() {
  return null;
}
