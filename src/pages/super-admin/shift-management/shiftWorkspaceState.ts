import type { OperationalAgencySummary } from "@/lib/operational-agency/types";

export interface ShiftDateRange {
  startDate: string;
  endDate: string;
}

export interface ShiftWorkspaceState extends ShiftDateRange {
  view: "calendar" | "list";
  agencyId?: string;
}

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

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed
    : null;
}

function defaultDateRange(now: Date): ShiftDateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - 29);
  return { startDate: formatDate(start), endDate: formatDate(now) };
}

function rangeFrom(params: URLSearchParams, now: Date): ShiftDateRange {
  const start = parseDate(params.get("startDate"));
  const end = parseDate(params.get("endDate"));
  const spanDays = start && end ? Math.round((end.getTime() - start.getTime()) / 86_400_000) : -1;
  if (start && end && start <= end && spanDays <= 365) {
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }
  return defaultDateRange(now);
}

function validAgencyId(
  value: string | undefined,
  agencies: readonly OperationalAgencySummary[],
): string | undefined {
  const agencyId = value?.trim();
  if (!agencyId) return undefined;
  return agencies.some((agency) => agency.status === "active" && agency.id === agencyId)
    ? agencyId
    : undefined;
}

function serializeWorkspace(search: string, state: ShiftWorkspaceState): string {
  const params = paramsFor(search);
  params.delete("month");
  params.delete("agencyIds");
  params.set("startDate", state.startDate);
  params.set("endDate", state.endDate);
  params.set("view", state.view);
  if (state.agencyId) params.set("agencyId", state.agencyId);
  else params.delete("agencyId");
  return stringify(params);
}

export function resolveInitialShiftWorkspace(
  search: string,
  agencies: readonly OperationalAgencySummary[],
  savedAgencyIds?: readonly string[],
  now = new Date(),
): ShiftWorkspaceState {
  const params = paramsFor(search);
  const range = rangeFrom(params, now);
  const requestedId = params.get("agencyId")?.trim()
    || params.getAll("agencyIds").map((id) => id.trim()).find(Boolean)
    || savedAgencyIds?.map((id) => id.trim()).find(Boolean);
  const agencyId = validAgencyId(requestedId, agencies);
  return {
    view: params.get("view") === "list" ? "list" : "calendar",
    ...range,
    ...(agencyId ? { agencyId } : {}),
  };
}

export function updateShiftWorkspaceSelection(
  search: string,
  state: ShiftWorkspaceState,
  selectedIds: readonly string[],
): ShiftWorkspaceTransition {
  const agencyId = selectedIds.map((id) => id.trim()).find(Boolean);
  const nextState: ShiftWorkspaceState = { ...state, ...(agencyId ? { agencyId } : {}) };
  if (!agencyId) delete nextState.agencyId;
  return { state: nextState, search: serializeWorkspace(search, nextState), requiresAgencyChoice: false };
}

export function transitionShiftWorkspaceView(
  search: string,
  state: ShiftWorkspaceState,
  nextView: ShiftWorkspaceState["view"],
  explicitAgencyId?: string,
): ShiftWorkspaceTransition {
  const agencyId = explicitAgencyId?.trim() || state.agencyId;
  const nextState: ShiftWorkspaceState = {
    view: nextView,
    startDate: state.startDate,
    endDate: state.endDate,
    ...(agencyId ? { agencyId } : {}),
  };
  return { state: nextState, search: serializeWorkspace(search, nextState), requiresAgencyChoice: false };
}

export function updateShiftWorkspaceDateRange(
  search: string,
  state: ShiftWorkspaceState,
  range: ShiftDateRange,
): ShiftWorkspaceTransition {
  const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
  const nextRange = rangeFrom(params, new Date(`${state.endDate}T12:00:00`));
  const nextState: ShiftWorkspaceState = { ...state, ...nextRange };
  return { state: nextState, search: serializeWorkspace(search, nextState), requiresAgencyChoice: false };
}
