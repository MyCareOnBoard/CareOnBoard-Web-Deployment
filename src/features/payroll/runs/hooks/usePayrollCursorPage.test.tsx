import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  PayrollEmployeeFilter,
  PayrollEmployeePage,
  PayrollEmployeeSummary,
} from "../model/types";
import { usePayrollCursorPage } from "./usePayrollCursorPage";

const endpoint = vi.hoisted(() => ({ trigger: vi.fn(), isFetching: false }));

vi.mock("../api/payrollRunEndpoints", () => ({
  useLazyListPayrollRunEmployeesQuery: () => [endpoint.trigger, { isFetching: endpoint.isFetching }],
}));

const identity = {
  audience: "agency" as const,
  actorUid: "actor-1",
  agencyId: "agency-1",
  kind: "run" as const,
  runId: "run-1",
  activeRevisionId: "revision-1",
  revisionNumber: 1,
};

const employees = (prefix: string, count: number): PayrollEmployeeSummary[] => Array.from(
  { length: count },
  (_, index) => ({ employeeId: `${prefix}-${index}`, displayName: `${prefix} ${index}` } as PayrollEmployeeSummary),
);

const page = (
  items: PayrollEmployeeSummary[],
  nextCursor: string | null,
): PayrollEmployeePage => ({
  kind: "run",
  runId: identity.runId,
  activeRevisionId: identity.activeRevisionId,
  revisionNumber: identity.revisionNumber,
  items,
  nextCursor,
  hasMore: nextCursor !== null,
});

function request(result: PayrollEmployeePage | Promise<PayrollEmployeePage>) {
  const value = Promise.resolve(result);
  return Object.assign(value, { unwrap: () => value, abort: vi.fn() });
}

describe("usePayrollCursorPage", () => {
  beforeEach(() => {
    endpoint.trigger.mockReset();
    endpoint.isFetching = false;
  });

  it("replaces pages, caps them at 50 rows, and restores Previous from its cursor stack", async () => {
    endpoint.trigger.mockReturnValueOnce(request(page(employees("next", 2), null)));
    const { result } = renderHook(() => usePayrollCursorPage({
      identity,
      initialPage: page(employees("initial", 55), "cursor-2"),
      filter: "all",
      sort: "name_asc",
    }));

    expect(result.current.items).toHaveLength(50);
    await act(() => result.current.next());
    expect(result.current.items.map(({ employeeId }) => employeeId)).toEqual(["next-0", "next-1"]);
    expect(endpoint.trigger).toHaveBeenCalledWith(expect.objectContaining({ cursor: "cursor-2" }), false);

    act(() => result.current.previous());
    expect(result.current.items).toHaveLength(50);
    expect(result.current.items[0]?.employeeId).toBe("initial-0");
    expect(endpoint.trigger).toHaveBeenCalledOnce();
  });

  it("resets its stack when revision, filter, or sort changes", async () => {
    endpoint.trigger.mockReturnValueOnce(request(page(employees("next", 1), null)));
    let filter: PayrollEmployeeFilter = "all";
    const { result, rerender } = renderHook(() => usePayrollCursorPage({
      identity,
      initialPage: page(employees("initial", 2), "cursor-2"),
      filter,
      sort: "name_asc",
    }));
    await act(() => result.current.next());
    expect(result.current.canPrevious).toBe(true);

    filter = "blocked";
    rerender();
    await waitFor(() => expect(result.current.canPrevious).toBe(false));
    expect(result.current.items[0]?.employeeId).toBe("initial-0");
  });

  it("keeps the visible page and refreshes current identity when a cursor is stale", async () => {
    const onCursorStale = vi.fn();
    const stale = Object.assign(Promise.reject({ data: { code: "CURSOR_STALE" } }), {
      unwrap: () => Promise.reject({ data: { code: "CURSOR_STALE" } }),
      abort: vi.fn(),
    });
    stale.catch(() => undefined);
    endpoint.trigger.mockReturnValueOnce(stale);
    const { result } = renderHook(() => usePayrollCursorPage({
      identity,
      initialPage: page(employees("initial", 2), "cursor-2"),
      filter: "all",
      sort: "name_asc",
      onCursorStale,
    }));

    await act(() => result.current.next());

    expect(result.current.items[0]?.employeeId).toBe("initial-0");
    expect(result.current.errorCode).toBe("CURSOR_STALE");
    expect(onCursorStale).toHaveBeenCalledOnce();
  });

  it("replaces a refreshed first-page row when financial or status fields change", async () => {
    let initialPage = page([
      { ...employees("same", 1)[0], disposition: "included", totalDueCents: 100_00 },
    ] as PayrollEmployeeSummary[], null);
    const { result, rerender } = renderHook(() => usePayrollCursorPage({
      identity,
      initialPage,
      filter: "all",
      sort: "name_asc",
    }));
    expect(result.current.items[0]).toMatchObject({ disposition: "included", totalDueCents: 100_00 });

    initialPage = page([
      { ...employees("same", 1)[0], disposition: "blocked", totalDueCents: 125_00 },
    ] as PayrollEmployeeSummary[], null);
    rerender();

    await waitFor(() => expect(result.current.items[0]).toMatchObject({
      disposition: "blocked",
      totalDueCents: 125_00,
    }));
  });
});
