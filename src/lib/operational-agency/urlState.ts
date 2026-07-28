export type OperationalView = "calendar" | "list";

export interface CalendarSearchState {
  agencyIds: string[];
  month: string;
  view: "calendar";
}

export interface ListSearchState {
  agencyId?: string;
  month: string;
  view: "list";
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidOperationalMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function normalizeMonth(value: string | null, fallbackMonth: string): string {
  return isValidOperationalMonth(value) ? value : fallbackMonth;
}

function uniqueIds(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = value.trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((value) => value.trim());
}

function paramsFor(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

function stringify(params: URLSearchParams): string {
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function parseCalendarSearch(search: string, fallbackMonth = currentMonth()): CalendarSearchState {
  const params = paramsFor(search);
  return {
    agencyIds: uniqueIds(params.getAll("agencyIds")),
    month: normalizeMonth(params.get("month"), fallbackMonth),
    view: "calendar",
  };
}

export function parseListSearch(search: string, fallbackMonth = currentMonth()): ListSearchState {
  const params = paramsFor(search);
  const agencyId = params.get("agencyId")?.trim();
  return {
    ...(agencyId ? { agencyId } : {}),
    month: normalizeMonth(params.get("month"), fallbackMonth),
    view: "list",
  };
}

export function serializeCalendarSearch(
  search: string,
  state: Pick<CalendarSearchState, "agencyIds" | "month">,
): string {
  const params = paramsFor(search);
  params.delete("agencyIds");
  for (const agencyId of uniqueIds(state.agencyIds)) {
    params.append("agencyIds", agencyId);
  }
  params.set("month", normalizeMonth(state.month, currentMonth()));
  params.set("view", "calendar");
  return stringify(params);
}

export function calendarSearchToListSearch(search: string, agencyId?: string): string {
  const params = paramsFor(search);
  const selectedAgencyId = agencyId?.trim() || uniqueIds(params.getAll("agencyIds"))[0];
  params.delete("agencyIds");
  if (selectedAgencyId) params.set("agencyId", selectedAgencyId);
  else params.delete("agencyId");
  params.set("month", normalizeMonth(params.get("month"), currentMonth()));
  params.set("view", "list");
  return stringify(params);
}
