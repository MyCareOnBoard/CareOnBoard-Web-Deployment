export interface NotesWorkspaceState {
  agencyId?: string;
  startDate: string;
  endDate: string;
}

export interface NotesWorkspaceTransition {
  state: NotesWorkspaceState;
  search: string;
}

export interface NotesDateRange {
  startDate: string;
  endDate: string;
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
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function defaultDateRange(now: Date): NotesDateRange {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function rangeFrom(params: URLSearchParams, now: Date): NotesDateRange {
  const start = parseDate(params.get("startDate"));
  const end = parseDate(params.get("endDate"));
  if (!start || !end || start > end) return defaultDateRange(now);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function serializeNotesWorkspace(search: string, state: NotesWorkspaceState): string {
  const params = paramsFor(search);
  params.set("startDate", state.startDate);
  params.set("endDate", state.endDate);
  if (state.agencyId) params.set("agencyId", state.agencyId);
  else params.delete("agencyId");
  return stringify(params);
}

export function resolveNotesWorkspace(search: string, now = new Date()): NotesWorkspaceState {
  const params = paramsFor(search);
  const agencyId = params.get("agencyId")?.trim();
  return {
    ...rangeFrom(params, now),
    ...(agencyId ? { agencyId } : {}),
  };
}

export function updateNotesAgency(search: string, ids: readonly string[]): NotesWorkspaceTransition {
  const state = resolveNotesWorkspace(search);
  const agencyId = ids.map((id) => id.trim()).find(Boolean);
  const nextState: NotesWorkspaceState = { ...state, ...(agencyId ? { agencyId } : {}) };
  if (!agencyId) delete nextState.agencyId;
  return { state: nextState, search: serializeNotesWorkspace(search, nextState) };
}

export function updateNotesDateRange(search: string, range: NotesDateRange): NotesWorkspaceTransition {
  const state = resolveNotesWorkspace(search);
  const rangeParams = new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate,
  });
  const nextState: NotesWorkspaceState = {
    ...state,
    ...rangeFrom(rangeParams, new Date(`${state.endDate}T12:00:00`)),
  };
  return { state: nextState, search: serializeNotesWorkspace(search, nextState) };
}
