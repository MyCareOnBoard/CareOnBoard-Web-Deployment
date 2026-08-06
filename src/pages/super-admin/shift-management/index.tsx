import { useCallback, useState } from "react";
import { AlertTriangle, CalendarDays, List } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { useListAllAgenciesQuery } from "@/pages/super-admin/agencies/api";
import { Routes } from "@/routes/constants";
import { superAdminShiftRoutes } from "@/lib/operational-agency/routes";
import { useAuth } from "@/utils/auth";
import ShiftManagementHeader from "./ShiftManagementHeader";
import SuperAdminShiftsCalendar from "./SuperAdminShiftsCalendar";
import {
  resolveInitialShiftWorkspace,
  transitionShiftWorkspaceView,
  updateShiftWorkspaceDateRange,
  updateShiftWorkspaceSelection,
  type ShiftWorkspaceState,
} from "./shiftWorkspaceState";
import type { NormalizedCalendarShift } from "./calendarModel";
import ShiftStatsSection from "./ShiftStatsSection";
import { resolveShiftMaintenanceDateRange } from "@/pages/shared/shift-maintenance/shiftMaintenanceDateRange";
import ShiftCategoryFilter from "./ShiftCategoryFilter";
import { parseShiftCategory, type ShiftCategory } from "@/lib/shift-category";
import { Skeleton } from "@/components/ui/skeleton";

const OPERATIONAL_AGENCY_SUMMARY_FEATURES = [
  "id",
  "name",
  "status",
  "supportedClientTypes",
  "timezone",
].join(",");

function activeSorted(agencies: Iterable<OperationalAgencySummary>): OperationalAgencySummary[] {
  return [...agencies]
    .filter((agency) => agency.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

function ShiftWorkspaceSkeleton() {
  return (
    <div className="space-y-5 pb-6" aria-label="Loading shift workspace" aria-busy="true">
      <div className="rounded-2xl border border-[#d9e4e4] bg-white p-5">
        <Skeleton className="h-7 w-52 rounded" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full rounded" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Skeleton className="h-11 w-56 rounded-xl" />
          <Skeleton className="h-11 w-64 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="rounded-2xl border border-[#d9e4e4] bg-white p-5">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="mt-3 h-8 w-40 rounded" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} data-testid="shift-workspace-skeleton-card" className="rounded-xl border border-[#e4eaea] p-3">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div data-testid="shift-workspace-skeleton-card" className="rounded-2xl border border-[#efdedb] bg-white p-5">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="mt-8 h-9 w-16 rounded" />
          <Skeleton className="mt-2 h-4 w-32 rounded" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-[28rem] w-full rounded-2xl" />
    </div>
  );
}

export default function ShiftManagementWorkspace() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCalendarRoute = location.pathname === Routes.superAdmin.shifts.index;
  const isShiftsRoute = isCalendarRoute || location.pathname === Routes.superAdmin.shifts.list;
  const isMaintenanceRoute = location.pathname === Routes.superAdmin.shifts.maintenance;
  const [discoveredAgencies, setDiscoveredAgencies] = useState<OperationalAgencySummary[]>([]);
  const { data, isLoading, isFetching, isError, refetch } = useListAllAgenciesQuery({
    status: "active",
    features: OPERATIONAL_AGENCY_SUMMARY_FEATURES,
  }, { skip: isMaintenanceRoute });
  const queriedAgencies = (data?.agencies ?? []).map((agency) => ({
    id: agency.id,
    name: agency.name,
    status: agency.status,
    supportedClientTypes: agency.supportedClientTypes ?? ["ddd", "hha"],
    timezone: agency.timezone ?? "UTC",
  }));
  const agencies = activeSorted(new Map(
    [...queriedAgencies, ...discoveredAgencies].map((agency) => [agency.id, agency]),
  ).values());

  const rememberAgencies = useCallback((items: OperationalAgencySummary[]) => {
    setDiscoveredAgencies((current) => activeSorted(new Map(
      [...current, ...items].map((agency) => [agency.id, agency]),
    ).values()));
  }, []);

  const workspaceSearch = isCalendarRoute
    ? location.search
    : (() => {
      const params = new URLSearchParams(location.search);
      params.set("view", "list");
      return `?${params.toString()}`;
    })();
  const workspace = resolveInitialShiftWorkspace(workspaceSearch, agencies);
  const searchParams = new URLSearchParams(location.search);
  const maintenanceDateRange = resolveShiftMaintenanceDateRange(location.search);
  const activeDateRange = isMaintenanceRoute
    ? maintenanceDateRange
    : { startDate: workspace.startDate, endDate: workspace.endDate };
  const activeAgencyId = isMaintenanceRoute
    ? searchParams.get("agencyId")?.trim() || undefined
    : workspace.agencyId;
  const selectedIds = activeAgencyId ? [activeAgencyId] : [];
  const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
  const selectedAgencies = selectedIds.flatMap((id) => {
    const agency = agencyById.get(id);
    return agency ? [agency] : [];
  });
  const mode = searchParams.get("clientType") === "hha" ? "hha" : "ddd";
  const activeShiftCategory = parseShiftCategory(location.search);
  const canAccessShiftMaintenance = user?.profile?.accessList?.includes("Shift Maintenance") ?? false;
  const canManageShifts = user?.profile?.accessList?.includes("Shift Management") ?? false;

  const navigateTo = (next: ShiftWorkspaceState, search: string) => {
    navigate({
      pathname: next.view === "list" ? Routes.superAdmin.shifts.list : Routes.superAdmin.shifts.index,
      search,
    });
  };

  const changeSelection = (ids: string[]) => {
    // if (isMaintenanceRoute) {
    //   const params = new URLSearchParams(location.search);
    //   const agencyId = ids.map((id) => id.trim()).find(Boolean);
    //   if (agencyId) params.set("agencyId", agencyId);
    //   else params.delete("agencyId");
    //   params.set("startDate", activeDateRange.startDate);
    //   params.set("endDate", activeDateRange.endDate);
    //   navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    //   return;
    // }
    const transition = updateShiftWorkspaceSelection(location.search, workspace, ids);
    navigateTo(transition.state, transition.search);
  };

  const changeDateRange = (range: { startDate: string; endDate: string }) => {
    if (isMaintenanceRoute) {
      const params = new URLSearchParams(location.search);
      params.set("startDate", range.startDate);
      params.set("endDate", range.endDate);
      navigate({ pathname: location.pathname, search: `?${params.toString()}` });
      return;
    }
    const transition = updateShiftWorkspaceDateRange(location.search, workspace, range);
    navigateTo(transition.state, transition.search);
  };

  const changeView = (view: ShiftWorkspaceState["view"]) => {
    const transition = transitionShiftWorkspaceView(location.search, workspace, view);
    navigateTo(transition.state, transition.search);
  };

  const changeShiftCategory = (category: ShiftCategory | null) => {
    const params = new URLSearchParams(location.search);
    if (category) params.set("shiftCategory", category);
    else params.delete("shiftCategory");
    const pathname = isMaintenanceRoute ? Routes.superAdmin.shifts.index : location.pathname;
    if (isMaintenanceRoute) params.set("view", "calendar");
    navigate({ pathname, search: `?${params.toString()}` });
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
    params.delete("month");
    params.set("startDate", workspace.startDate);
    params.set("endDate", workspace.endDate);
    params.set("view", "list");
    return `?${params.toString()}`;
  };

  const openSection = (pathname: string) => {
    if (pathname === Routes.superAdmin.shifts.index) {
      const transition = transitionShiftWorkspaceView(location.search, workspace, "calendar");
      navigate({ pathname, search: transition.search });
      return;
    }
    if (pathname === Routes.superAdmin.shifts.maintenance) {
      navigate({ pathname, search: `?${maintenanceSearch.toString()}` });
      return;
    }
    navigate({ pathname, search: singularSearch() });
  };

  const maintenanceSearch = new URLSearchParams();
  if (workspace.agencyId) maintenanceSearch.set("agencyId", workspace.agencyId);
  maintenanceSearch.set("startDate", workspace.startDate);
  maintenanceSearch.set("endDate", workspace.endDate);

  if (!isMaintenanceRoute && (isLoading || isFetching)) {
    return <ShiftWorkspaceSkeleton />;
  }

  if (!isMaintenanceRoute && isError) {
    return (
      <div className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center" role="alert">
        <AlertTriangle aria-hidden="true" className="mx-auto h-7 w-7 text-[#9a4038]" />
        <p className="mt-2 text-sm font-semibold text-[#7e3029]">Could not load your agencies.</p>
        <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <ShiftManagementHeader
        title={isMaintenanceRoute ? "Shift Maintenance" : "Shift management"}
        feature={isMaintenanceRoute ? "shift-maintenance" : "shift-management"}
        enforceManagementDateRangeRules={!isMaintenanceRoute}
        dateRange={activeDateRange}
        selectedAgencyIds={selectedIds}
        onDateRangeChange={changeDateRange}
        onAgencySelectionChange={changeSelection}
        initialAgencies={isMaintenanceRoute && agencies.length === 0 ? undefined : agencies}
        onAgenciesDiscovered={rememberAgencies}
        requiresAgencyChoice={false}
      />

      {canManageShifts ? <ShiftStatsSection
        agencyId={activeAgencyId ?? ""}
        dateRange={activeDateRange}
        mode={mode}
        // maintenanceHref={!isMaintenanceRoute && canAccessShiftMaintenance
        //   ? `${Routes.superAdmin.shifts.maintenance}?${maintenanceSearch.toString()}`
        //   : undefined}
        activeCategory={activeShiftCategory}
        onCategoryChange={changeShiftCategory}
      /> : null}

      <nav
        aria-label="Shift workspace sections"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce3e3] bg-white/70 p-2"
      >
        <div className="flex min-w-0 flex-wrap gap-2">
          {[
            canManageShifts
              ? { label: "Shifts", pathname: workspace.view === "calendar" ? Routes.superAdmin.shifts.index : Routes.superAdmin.shifts.list, active: isShiftsRoute }
              : null,
            // canAccessShiftMaintenance
            //   ? { label: "Maintenance", pathname: Routes.superAdmin.shifts.maintenance, active: isMaintenanceRoute }
            //   : null,
          ].filter((item): item is { label: string; pathname: string; active: boolean } => item !== null).map(({ label, pathname, active }) => (
            <button
              key={label}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => openSection(pathname)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors cursor-pointer ${active
                ? "bg-[#075b5d] text-white"
                : "text-[#4d5a5c] hover:bg-[#edf5f5]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isShiftsRoute ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <ShiftCategoryFilter value={activeShiftCategory} onChange={changeShiftCategory} />
            <div role="group" aria-label="Shift workspace view" className="grid grid-cols-2 rounded-lg bg-[#e9eeee] p-1">
            {([
              ["calendar", "Calendar", CalendarDays],
              ["list", "List", List],
            ] as const).map(([view, label, Icon]) => (
              <button
                key={view}
                type="button"
                aria-label={`${label} view`}
                aria-pressed={workspace.view === view}
                onClick={() => changeView(view)}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] ${workspace.view === view
                  ? "bg-white text-[#075b5d] shadow-[0_1px_2px_rgba(26,54,55,0.12)]"
                  : "text-[#5e696b] hover:bg-white/60"}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </button>
            ))}
            </div>
          </div>
        ) : null}
      </nav>

      {/* {!isMaintenanceRoute && selectedAgencies.length === 1 ? (
        <div
          role="status"
          aria-label="Selected operational agency"
          className="rounded-xl border border-[#b9dfe0] bg-[#eefafa] px-4 py-3 text-sm text-[#234f50]"
        >
          Operating in <strong>{selectedAgencies[0].name}</strong>
        </div>
      ) : null} */}

      {isCalendarRoute && workspace.view === "calendar" ? (
        <SuperAdminShiftsCalendar
          agencies={selectedAgencies}
          dateRange={{ startDate: workspace.startDate, endDate: workspace.endDate }}
          mode={mode}
          category={activeShiftCategory}
          onSelectionChange={changeSelection}
          onOpenShift={openCalendarShift}
        />
      ) : null}

      {!isCalendarRoute ? <Outlet context={{ agencies }} /> : null}
    </div>
  );
}

export function SuperAdminShiftWorkspaceIndex() {
  return null;
}
