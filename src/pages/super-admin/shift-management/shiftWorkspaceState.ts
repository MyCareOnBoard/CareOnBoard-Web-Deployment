import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { isValidOperationalMonth } from "@/lib/operational-agency/urlState";

export interface CalendarShiftWorkspace {
  view: "calendar";
  month: string;
  agencyIds: string[];
}

export interface ListShiftWorkspace {
  view: "list";
  month: string;
  agencyId?: string;
}

export type ShiftWorkspaceState = CalendarShiftWorkspace | ListShiftWorkspace;

export interface ShiftWorkspaceTransition {
  state: ShiftWorkspaceState;
  search: string;
  requiresAgencyChoice: boolean;
}

function paramsFor(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

function stringify(params: URLSearchParams): string {
  const search = params.toString();
  return search ? `?${search}` : "";
}

function monthFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function allowedAgencies(agencies: readonly OperationalAgencySummary[]): OperationalAgencySummary[] {
  return agencies
    .filter((agency) => agency.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

function validSelection(ids: readonly string[], allowedIds: ReadonlySet<string>): string[] {
  return unique(ids).filter((id) => allowedIds.has(id));
}

function serializeWorkspace(search: string, state: ShiftWorkspaceState): string {
  const params = paramsFor(search);

  if (state.view === "calendar") {
    params.delete("agencyId");
    params.delete("agencyIds");
    params.set("month", state.month);
    params.set("view", "calendar");
    const agencyIds = unique(state.agencyIds);
    if (agencyIds.length === 0) params.append("agencyIds", "");
    else for (const agencyId of agencyIds) params.append("agencyIds", agencyId);
  } else {
    params.delete("agencyIds");
    if (state.agencyId) params.set("agencyId", state.agencyId);
    else params.delete("agencyId");
    params.set("month", state.month);
    params.set("view", "list");
  }

  return stringify(params);
}

export function resolveInitialShiftWorkspace(
  search: string,
  agencies: readonly OperationalAgencySummary[],
  savedAgencyIds?: readonly string[],
  now = new Date(),
): ShiftWorkspaceState {
  const params = paramsFor(search);
  const month = isValidOperationalMonth(params.get("month"))
    ? params.get("month") as string
    : monthFor(now);
  const allowed = allowedAgencies(agencies);
  const allowedIds = new Set(allowed.map((agency) => agency.id));

  if (params.get("view") === "list") {
    const requestedAgencyId = params.get("agencyId")?.trim();
    const agencyId = requestedAgencyId
      ? allowedIds.has(requestedAgencyId) ? requestedAgencyId : undefined
      : allowed.length === 1 ? allowed[0].id : undefined;
    return { view: "list", month, ...(agencyId ? { agencyId } : {}) };
  }

  const requestedValues = params.getAll("agencyIds");
  const requestedIds = validSelection(requestedValues, allowedIds);
  if (requestedIds.length) return { view: "calendar", month, agencyIds: requestedIds };
  if (params.has("agencyIds")) {
    return { view: "calendar", month, agencyIds: [] };
  }
  if (allowed.length === 0) return { view: "calendar", month, agencyIds: [] };
  if (savedAgencyIds !== undefined) {
    return {
      view: "calendar",
      month,
      agencyIds: validSelection(savedAgencyIds, allowedIds),
    };
  }
  if (allowed.length === 1) return { view: "calendar", month, agencyIds: [allowed[0].id] };

  return {
    view: "calendar",
    month,
    agencyIds: [allowed[0].id],
  };
}

export function updateShiftWorkspaceSelection(
  search: string,
  state: ShiftWorkspaceState,
  selectedIds: readonly string[],
): ShiftWorkspaceTransition {
  if (state.view === "calendar") {
    const nextState: CalendarShiftWorkspace = {
      ...state,
      agencyIds: unique(selectedIds),
    };
    return {
      state: nextState,
      search: serializeWorkspace(search, nextState),
      requiresAgencyChoice: false,
    };
  }

  const agencyId = unique(selectedIds)[0];
  const nextState: ListShiftWorkspace = {
    view: "list",
    month: state.month,
    ...(agencyId ? { agencyId } : {}),
  };
  return {
    state: nextState,
    search: serializeWorkspace(search, nextState),
    requiresAgencyChoice: !agencyId,
  };
}

export function transitionShiftWorkspaceView(
  search: string,
  state: ShiftWorkspaceState,
  nextView: ShiftWorkspaceState["view"],
  explicitAgencyId?: string,
): ShiftWorkspaceTransition {
  if (nextView === state.view) {
    return {
      state,
      search: serializeWorkspace(search, state),
      requiresAgencyChoice: state.view === "list" && !state.agencyId,
    };
  }

  if (nextView === "calendar") {
    const nextState: CalendarShiftWorkspace = {
      view: "calendar",
      month: state.month,
      agencyIds: state.view === "list" && state.agencyId ? [state.agencyId] : [],
    };
    return {
      state: nextState,
      search: serializeWorkspace(search, nextState),
      requiresAgencyChoice: false,
    };
  }

  const chosenAgencyId = explicitAgencyId?.trim()
    || (state.view === "calendar" && state.agencyIds.length === 1 ? state.agencyIds[0] : "");
  if (!chosenAgencyId) {
    return { state, search, requiresAgencyChoice: true };
  }

  const nextState: ListShiftWorkspace = {
    view: "list",
    month: state.month,
    agencyId: chosenAgencyId,
  };
  return {
    state: nextState,
    search: serializeWorkspace(search, nextState),
    requiresAgencyChoice: false,
  };
}

export function updateShiftWorkspaceMonth(
  search: string,
  state: ShiftWorkspaceState,
  month: string,
): ShiftWorkspaceTransition {
  const nextState = {
    ...state,
    month: isValidOperationalMonth(month) ? month : state.month,
  } as ShiftWorkspaceState;
  return {
    state: nextState,
    search: serializeWorkspace(search, nextState),
    requiresAgencyChoice: nextState.view === "list" && !nextState.agencyId,
  };
}
