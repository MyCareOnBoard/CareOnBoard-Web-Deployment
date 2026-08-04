import type { BillingWorkspaceScope } from "./types";
import { normalizeNetworkPayrollWeekStart } from "./network/networkPayrollWeek";

export type BillingProgramMode = "ddd" | "hha";
export type BillingPayrollTab = "due" | "saved";

export interface BillingWorkspaceState {
  scope: BillingWorkspaceScope;
  startDate: string;
  endDate: string;
  mode: BillingProgramMode | null;
  payrollWeekStart: string;
  payrollTab: BillingPayrollTab;
}

export interface BillingWorkspaceDateRange {
  startDate: string;
  endDate: string;
}

export function billingWorkspaceGeneration(state: Pick<
  BillingWorkspaceState,
  "scope" | "startDate" | "endDate" | "mode"
>): string {
  return JSON.stringify([
    state.scope.kind,
    state.scope.kind === "agency" ? state.scope.agencyId : null,
    state.startDate,
    state.endDate,
    state.mode,
  ]);
}

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 366;
const TRANSIENT_KEYS = ["cursor", "page"] as const;

function paramsFor(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

function stringify(params: URLSearchParams): string {
  const value = params.toString();
  return value ? `?${value}` : "";
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
    ? parsed
    : null;
}

function defaultDateRange(now: Date): BillingWorkspaceDateRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function parseDateRange(params: URLSearchParams, now: Date): BillingWorkspaceDateRange {
  const start = parseDate(params.get("startDate"));
  const end = parseDate(params.get("endDate"));
  if (start && end) {
    const spanDays = Math.round((Date.UTC(
      end.getFullYear(), end.getMonth(), end.getDate(),
    ) - Date.UTC(
      start.getFullYear(), start.getMonth(), start.getDate(),
    )) / DAY_MS) + 1;
    if (spanDays >= 1 && spanDays <= MAX_RANGE_DAYS) {
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
  }
  return defaultDateRange(now);
}

function clearTransientState(params: URLSearchParams): void {
  for (const key of TRANSIENT_KEYS) params.delete(key);
}

export function parseBillingWorkspace(search: string, now = new Date()): BillingWorkspaceState {
  const params = paramsFor(search);
  const requestedAgencyIds = params.getAll("agencyId");
  if (requestedAgencyIds.length > 1) {
    throw new Error("Choose exactly one agency to manage billing.");
  }
  const agencyId = requestedAgencyIds[0]?.trim();
  const range = parseDateRange(params, now);
  const requestedMode = params.get("clientType");
  const requestedPayrollTab = params.get("payrollTab");
  return {
    scope: agencyId ? { kind: "agency", agencyId } : { kind: "network" },
    ...range,
    mode: requestedMode === "ddd" || requestedMode === "hha" ? requestedMode : null,
    payrollWeekStart: normalizeNetworkPayrollWeekStart(params.get("payrollWeekStart") ?? "", range.endDate),
    payrollTab: requestedPayrollTab === "saved" ? "saved" : "due",
  };
}

export function canonicalizeBillingWorkspaceSearch(search: string, now = new Date()): string {
  const state = parseBillingWorkspace(search, now);
  const params = paramsFor(search);
  params.delete("scope");
  params.delete("agencyId");
  params.delete("startDate");
  params.delete("endDate");
  params.delete("clientType");
  params.delete("payrollWeekStart");
  params.delete("payrollTab");
  if (state.scope.kind === "network") params.set("scope", "network");
  else params.set("agencyId", state.scope.agencyId);
  params.set("startDate", state.startDate);
  params.set("endDate", state.endDate);
  if (state.mode) params.set("clientType", state.mode);
  params.set("payrollWeekStart", state.payrollWeekStart);
  params.set("payrollTab", state.payrollTab);
  return stringify(params);
}

export function updateBillingWorkspaceScope(search: string, scope: BillingWorkspaceScope): string {
  const params = paramsFor(search);
  params.delete("scope");
  params.delete("agencyId");
  clearTransientState(params);
  if (scope.kind === "network") {
    params.set("scope", "network");
  } else {
    const agencyId = scope.agencyId.trim();
    if (!agencyId) throw new Error("Choose exactly one agency to manage billing.");
    params.set("agencyId", agencyId);
  }
  return stringify(params);
}

export function updateBillingWorkspaceDateRange(
  search: string,
  range: BillingWorkspaceDateRange,
): string {
  const params = paramsFor(search);
  const parsed = parseDateRange(new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate,
  }), new Date());
  params.set("startDate", parsed.startDate);
  params.set("endDate", parsed.endDate);
  clearTransientState(params);
  return stringify(params);
}

export function updateBillingWorkspaceMode(
  search: string,
  mode: BillingProgramMode | null,
): string {
  const params = paramsFor(search);
  if (mode) params.set("clientType", mode);
  else params.delete("clientType");
  clearTransientState(params);
  return stringify(params);
}

export function updateBillingWorkspacePayrollWeek(search: string, weekStart: string): string {
  const workspace = parseBillingWorkspace(search);
  const params = paramsFor(search);
  params.set(
    "payrollWeekStart",
    normalizeNetworkPayrollWeekStart(weekStart, workspace.endDate),
  );
  clearTransientState(params);
  return stringify(params);
}

export function updateBillingWorkspacePayrollTab(search: string, tab: BillingPayrollTab): string {
  const params = paramsFor(search);
  params.set("payrollTab", tab);
  clearTransientState(params);
  return stringify(params);
}
