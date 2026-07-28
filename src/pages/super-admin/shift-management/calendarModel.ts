import type { CalendarShiftPage, CompactCalendarShift } from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";

export type CalendarAgencyStatus = "idle" | "loading" | "success" | "error" | "skipped";

export interface CalendarAgencyLoadState {
  status: CalendarAgencyStatus;
  error: string | null;
}

export interface NormalizedCalendarShift extends CompactCalendarShift {
  agencyId: string;
  agencyName: string;
}

export interface CalendarState {
  generation: number;
  requestKey: string;
  shiftById: Map<string, NormalizedCalendarShift>;
  shifts: NormalizedCalendarShift[];
  agencies: Map<string, CalendarAgencyLoadState>;
}

export function createCalendarState(
  agencies: readonly OperationalAgencySummary[],
  generation: number,
  requestKey = "",
): CalendarState {
  return {
    generation,
    requestKey,
    shiftById: new Map(),
    shifts: [],
    agencies: new Map(agencies.map((agency) => [
      agency.id,
      { status: "idle" as const, error: null },
    ])),
  };
}

function updateAgencyState(
  state: CalendarState,
  agencyId: string,
  value: CalendarAgencyLoadState,
  generation: number,
): CalendarState {
  if (state.generation !== generation) return state;
  const agencies = new Map(state.agencies);
  agencies.set(agencyId, value);
  return { ...state, agencies };
}

export function markCalendarAgencyLoading(
  state: CalendarState,
  agencyId: string,
  generation: number,
): CalendarState {
  return updateAgencyState(state, agencyId, { status: "loading", error: null }, generation);
}

export function markCalendarAgencyError(
  state: CalendarState,
  agencyId: string,
  error: string,
  generation: number,
): CalendarState {
  return updateAgencyState(state, agencyId, { status: "error", error }, generation);
}

export function markCalendarAgencySuccess(
  state: CalendarState,
  agencyId: string,
  generation: number,
): CalendarState {
  return updateAgencyState(state, agencyId, { status: "success", error: null }, generation);
}

export function markCalendarAgencySkipped(
  state: CalendarState,
  agencyId: string,
  generation: number,
): CalendarState {
  return updateAgencyState(state, agencyId, { status: "skipped", error: null }, generation);
}

export function mergeCalendarAgencyPage(
  state: CalendarState,
  agency: OperationalAgencySummary,
  page: CalendarShiftPage,
  generation: number,
): CalendarState {
  if (state.generation !== generation) return state;

  const shiftById = new Map(state.shiftById);
  for (const shift of page.shifts) {
    if (shiftById.has(shift.id)) continue;
    shiftById.set(shift.id, {
      ...shift,
      agencyId: agency.id,
      agencyName: agency.name,
    });
  }

  const shifts = [...shiftById.values()].sort((left, right) => (
    left.date.localeCompare(right.date)
    || (left.startTime || "").localeCompare(right.startTime || "")
    || left.agencyName.localeCompare(right.agencyName)
    || left.id.localeCompare(right.id)
  ));

  return { ...state, shiftById, shifts };
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T, signal: AbortSignal) => Promise<R>,
  signal: AbortSignal,
): Promise<R[]> {
  if (signal.aborted) throw abortError();
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer.");
  }

  const results = new Array<R>(values.length);
  let nextIndex = 0;

  const run = async () => {
    while (nextIndex < values.length) {
      if (signal.aborted) throw abortError();
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(values[index], signal);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    () => run(),
  );
  await Promise.all(workers);
  if (signal.aborted) throw abortError();
  return results;
}

export interface KeyedConcurrencyScheduler<T> {
  enqueue: (value: T) => boolean;
  cancel: () => void;
}

export function createKeyedConcurrencyScheduler<T>(
  concurrency: number,
  keyFor: (value: T) => string,
  worker: (value: T, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
): KeyedConcurrencyScheduler<T> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("concurrency must be a positive integer.");
  }
  const queuedOrActive = new Set<string>();
  const queue: T[] = [];
  let active = 0;
  let cancelled = signal.aborted;

  const drain = () => {
    while (!cancelled && !signal.aborted && active < concurrency && queue.length > 0) {
      const value = queue.shift() as T;
      const key = keyFor(value);
      active += 1;
      void worker(value, signal).finally(() => {
        active -= 1;
        queuedOrActive.delete(key);
        drain();
      });
    }
  };

  const cancel = () => {
    cancelled = true;
    queue.length = 0;
    queuedOrActive.clear();
  };
  signal.addEventListener("abort", cancel, { once: true });

  return {
    enqueue(value) {
      const key = keyFor(value);
      if (cancelled || signal.aborted || queuedOrActive.has(key)) return false;
      queuedOrActive.add(key);
      queue.push(value);
      drain();
      return true;
    },
    cancel,
  };
}
