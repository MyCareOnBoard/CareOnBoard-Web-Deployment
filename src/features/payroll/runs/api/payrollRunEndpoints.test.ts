import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { payrollRunEmployeeTag } from "../../api/cacheTags";
import {
  payrollRunApi,
  payrollRunCacheKeys,
  payrollRunRequests,
  type CurrentPayrollRunArgs,
  type ForceBuildStatusArgs,
} from "./payrollRunEndpoints";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const scope = {
  audience: "agency" as const,
  actorUid: "actor-1",
  agencyId: "agency-1",
  mode: "ddd" as const,
};

const validUpcomingResponse = () => ({
  kind: "upcoming",
  mode: "ddd",
  projectionRevision: 4,
  forceBuild: { enabled: true, reasonCode: null },
  periodStart: "2026-08-24",
  periodEnd: "2026-09-06",
  payday: "2026-09-11",
  totals: {
    regularHours: 72,
    overtimeHours: 4,
    totalHours: 76,
    grossEarningsCents: 152_000,
    reimbursementCents: 5_000,
    totalDueCents: 157_000,
  },
  employeeCount: 2,
  blockerCount: 1,
  blockerCodes: ["compensation_missing"],
  sourceCounts: { shift: 8, ride: 1, expense: 1, staff_timesheet: 1 },
  items: [{
    employeeId: "employee-a",
    employmentType: "field",
    displayName: "Alex Morgan",
    regularHours: 40,
    overtimeHours: 4,
    grossEarningsCents: 88_000,
    reimbursementCents: 5_000,
    totalDueCents: 93_000,
    sourceCount: 7,
    sourceCounts: { shift: 5, ride: 1, expense: 1, staff_timesheet: 0 },
    hasBlockers: true,
    blockerCodes: ["compensation_missing"],
  }],
  nextCursor: "upcoming-page-2",
  hasMore: true,
  asOf: "2026-08-25T12:00:00.000Z",
});

const validForceBuildStatus = (buildId = "build-a") => ({ buildId, state: "queued", pollAfterMs: 2000 });

describe("payroll run read transport", () => {
  beforeEach(() => baseQuery.mockReset());

  it("registers authenticated agency payroll and force-build endpoints", () => {
    expect(Object.keys(payrollRunApi.endpoints)).toEqual(expect.arrayContaining([
      "getCurrentPayrollRun",
      "getCurrentPayrollEmployees",
      "getUpcomingPayroll",
      "forceBuildUpcomingPayroll",
      "getForceBuildStatus",
      "listPayrollRuns",
      "getPayrollRun",
      "listPayrollRunEmployees",
      "getPayrollRunEmployee",
      "listPayrollRunEmployeeSources",
      "listPayrollRunEvents",
      "listPayrollObligations",
    ]));
  });

  it("accepts only agency-scoped arguments for agency payroll routes", () => {
    expectTypeOf<CurrentPayrollRunArgs["audience"]>().toEqualTypeOf<"agency">();
    expectTypeOf<CurrentPayrollRunArgs["mode"]>().toEqualTypeOf<"ddd" | "hha">();
    expectTypeOf<ForceBuildStatusArgs["audience"]>().toEqualTypeOf<"agency">();
  });

  it("sends only the approved upcoming-projection fence when force-building", () => {
    expect(payrollRunRequests.forceBuild({
      ...scope,
      periodStart: "2026-08-31",
      periodEnd: "2026-09-06",
      payday: "2026-09-11",
      expectedProjectionRevision: 27,
    })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/upcoming/force-build",
      method: "POST",
      requiresAuth: true,
      params: { mode: "ddd" },
      data: {
        periodStart: "2026-08-31",
        periodEnd: "2026-09-06",
        payday: "2026-09-11",
        expectedProjectionRevision: 27,
      },
    });
  });

  it("encodes opaque force-build status IDs and sends only mode", () => {
    expect(payrollRunRequests.forceBuildStatus({ ...scope, buildId: "build/a?private" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/upcoming/force-build/build%2Fa%3Fprivate",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd" },
    });
  });

  it("keys force-build status by trusted scope, mode, and opaque build ID", () => {
    const args = { ...scope, buildId: "build-a" };
    expect(payrollRunCacheKeys.forceBuildStatus(args)).not.toBe(payrollRunCacheKeys.forceBuildStatus({
      ...args,
      actorUid: "actor-2",
    }));
    expect(payrollRunCacheKeys.forceBuildStatus(args)).not.toBe(payrollRunCacheKeys.forceBuildStatus({
      ...args,
      mode: "hha",
    }));
    expect(payrollRunCacheKeys.forceBuildStatus(args)).not.toBe(payrollRunCacheKeys.forceBuildStatus({
      ...args,
      buildId: "build-b",
    }));
  });

  it("parses independently keyed force-build status responses and removes unused cache entries", async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    const first = { ...scope, buildId: "build-a" };
    const second = { ...scope, buildId: "build-b" };
    baseQuery.mockResolvedValueOnce({ data: validForceBuildStatus(first.buildId) });
    baseQuery.mockResolvedValueOnce({ data: validForceBuildStatus(second.buildId) });

    try {
      const firstSubscription = store.dispatch(payrollRunApi.endpoints.getForceBuildStatus.initiate(first));
      const secondSubscription = store.dispatch(payrollRunApi.endpoints.getForceBuildStatus.initiate(second));
      await expect(firstSubscription.unwrap()).resolves.toEqual(validForceBuildStatus(first.buildId));
      await expect(secondSubscription.unwrap()).resolves.toEqual(validForceBuildStatus(second.buildId));
      expect(baseQuery).toHaveBeenCalledTimes(2);
      expect(payrollRunApi.endpoints.getForceBuildStatus.select(first)(store.getState()).data).toEqual(
        validForceBuildStatus(first.buildId),
      );
      expect(payrollRunApi.endpoints.getForceBuildStatus.select(second)(store.getState()).data).toEqual(
        validForceBuildStatus(second.buildId),
      );

      firstSubscription.unsubscribe();
      secondSubscription.unsubscribe();
      await vi.runAllTimersAsync();
      expect(payrollRunApi.endpoints.getForceBuildStatus.select(first)(store.getState()).data).toBeUndefined();
      expect(payrollRunApi.endpoints.getForceBuildStatus.select(second)(store.getState()).data).toBeUndefined();
    } finally {
      consoleError.mockRestore();
      vi.useRealTimers();
    }
  });

  it("rejects malformed force-build status responses instead of caching them", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    const args = { ...scope, buildId: "build-a" };
    baseQuery.mockResolvedValueOnce({ data: { buildId: "build-a", state: "queued", pollAfterMs: null } });

    try {
      await expect(store.dispatch(payrollRunApi.endpoints.getForceBuildStatus.initiate(args)).unwrap()).rejects.toBeDefined();
      expect(payrollRunApi.endpoints.getForceBuildStatus.select(args)(store.getState()).data).toBeUndefined();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not invalidate an active upcoming projection when force-build is accepted", async () => {
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    baseQuery.mockResolvedValueOnce({ data: validUpcomingResponse() });
    baseQuery.mockResolvedValueOnce({ data: validForceBuildStatus() });
    const upcomingSubscription = store.dispatch(payrollRunApi.endpoints.getUpcomingPayroll.initiate(scope));

    await expect(upcomingSubscription.unwrap()).resolves.toEqual(validUpcomingResponse());
    await expect(store.dispatch(payrollRunApi.endpoints.forceBuildUpcomingPayroll.initiate({
      ...scope,
      periodStart: "2026-08-31",
      periodEnd: "2026-09-06",
      payday: "2026-09-11",
      expectedProjectionRevision: 27,
    })).unwrap()).resolves.toEqual(validForceBuildStatus());
    await Promise.resolve();

    expect(baseQuery).toHaveBeenCalledTimes(2);
    expect(payrollRunApi.endpoints.getUpcomingPayroll.select(scope)(store.getState()).data).toEqual(validUpcomingResponse());
    upcomingSubscription.unsubscribe();
  });

  it("refetches a populated current employee page when the generic current-employee tag is invalidated", async () => {
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    const response = {
      kind: "run",
      runId: "run-a",
      activeRevisionId: "revision-a",
      revisionNumber: 1,
      items: [],
      nextCursor: null,
      hasMore: false,
    };
    baseQuery.mockResolvedValue({ data: response });
    const subscription = store.dispatch(payrollRunApi.endpoints.getCurrentPayrollEmployees.initiate(scope));

    await expect(subscription.unwrap()).resolves.toEqual(response);
    expect(baseQuery).toHaveBeenCalledOnce();

    store.dispatch(payrollRunApi.util.invalidateTags([
      payrollRunEmployeeTag(scope, "current", "current"),
    ]));

    await vi.waitFor(() => expect(baseQuery).toHaveBeenCalledTimes(2));
    subscription.unsubscribe();
  });

  it("builds the singular routes without client-owned authority or query input", () => {
    const requests = [
      payrollRunRequests.current(scope),
      payrollRunRequests.detail({ ...scope, runId: "run/a", activeRevisionId: "revision/private" }),
      payrollRunRequests.employeeDetail({
        ...scope,
        runId: "run/a",
        activeRevisionId: "revision/private",
        employeeId: "employee/a",
      }),
    ];

    expect(requests).toEqual([
      { url: "/checkPayrollAgency/payroll/agency/runs/current", method: "GET", requiresAuth: true, params: { mode: "ddd" } },
      { url: "/checkPayrollAgency/payroll/agency/runs/run%2Fa", method: "GET", requiresAuth: true, params: { mode: "ddd" } },
      {
        url: "/checkPayrollAgency/payroll/agency/runs/run%2Fa/employees/employee%2Fa",
        method: "GET",
        requiresAuth: true,
        params: { mode: "ddd" },
      },
    ]);
    const serialized = JSON.stringify(requests);
    expect(serialized).not.toContain("actor-1");
    expect(serialized).not.toContain("agency-1");
    expect(serialized).not.toContain("revision/private");
    expect(serialized).not.toMatch(/provider|environment/i);
  });

  it("sends fixed limits and only each list route's allowlisted query fields", () => {
    const upcoming = (payrollRunRequests as typeof payrollRunRequests & {
      upcoming?: (args: typeof scope & { cursor?: string }) => unknown;
    }).upcoming;
    expect(upcoming).toBeTypeOf("function");
    expect(upcoming?.({ ...scope, cursor: "upcoming-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/upcoming",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 50, cursor: "upcoming-page" },
    });
    expect(payrollRunRequests.currentEmployees({
      ...scope,
      filter: "blocked",
      sort: "gross_desc",
      cursor: "employee-page",
    })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/current/employees",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 50, filter: "blocked", sort: "gross_desc", cursor: "employee-page" },
    });
    expect(payrollRunRequests.list({ ...scope, runType: "off_cycle", cursor: "run-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 25, runType: "off_cycle", cursor: "run-page" },
    });
    expect(payrollRunRequests.employees({
      ...scope,
      runId: "run-a",
      activeRevisionId: "revision-a",
      filter: "included",
      sort: "name_asc",
      cursor: "employee-page",
    })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/run-a/employees",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 50, filter: "included", sort: "name_asc", cursor: "employee-page" },
    });
    expect(payrollRunRequests.sources({
      ...scope,
      runId: "run-a",
      activeRevisionId: "revision-a",
      employeeId: "employee-a",
      cursor: "source-page",
    })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/run-a/employees/employee-a/sources",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 50, cursor: "source-page" },
    });
    expect(payrollRunRequests.events({ ...scope, runId: "run-a", activeRevisionId: "revision-a", cursor: "event-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/run-a/events",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 25, cursor: "event-page" },
    });
    expect(payrollRunRequests.obligations({ ...scope, state: "operations_required", cursor: "obligation-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/obligations",
      method: "GET",
      requiresAuth: true,
      params: { mode: "ddd", limit: 25, state: "operations_required", cursor: "obligation-page" },
    });
  });

  it("omits optional list fields instead of sending empty or unauthorized values", () => {
    const upcoming = (payrollRunRequests as typeof payrollRunRequests & {
      upcoming?: (args: typeof scope & { cursor?: string }) => { params: unknown };
    }).upcoming;
    expect(upcoming).toBeTypeOf("function");
    const requests = [
      upcoming?.(scope),
      payrollRunRequests.currentEmployees(scope),
      payrollRunRequests.list(scope),
      payrollRunRequests.employees({ ...scope, runId: "run-a", activeRevisionId: "revision-a" }),
      payrollRunRequests.sources({ ...scope, runId: "run-a", activeRevisionId: "revision-a", employeeId: "employee-a" }),
      payrollRunRequests.events({ ...scope, runId: "run-a", activeRevisionId: "revision-a" }),
      payrollRunRequests.obligations(scope),
    ];
    expect(requests.map((request) => request?.params)).toEqual([
      { mode: "ddd", limit: 50 },
      { mode: "ddd", limit: 50 },
      { mode: "ddd", limit: 25 },
      { mode: "ddd", limit: 50 },
      { mode: "ddd", limit: 50 },
      { mode: "ddd", limit: 25 },
      { mode: "ddd", limit: 25 },
    ]);
    expect(JSON.stringify(requests)).not.toContain("activeRevisionId");
  });

  it("keys revision-scoped caches by trusted scope, run, and opaque revision ID", () => {
    const base = { ...scope, runId: "run-a", activeRevisionId: "revision-a" };
    expect(payrollRunCacheKeys.detail(base)).not.toBe(payrollRunCacheKeys.detail({
      ...base,
      activeRevisionId: "revision-b",
    }));
    expect(payrollRunCacheKeys.employees(base)).not.toBe(payrollRunCacheKeys.employees({
      ...base,
      actorUid: "actor-2",
    }));
    expect(payrollRunCacheKeys.employeeDetail({ ...base, employeeId: "employee-a" })).not.toBe(
      payrollRunCacheKeys.employeeDetail({ ...base, employeeId: "employee-b" }),
    );
  });

  it("keys upcoming pages by trusted scope and opaque cursor", () => {
    const upcoming = (payrollRunCacheKeys as typeof payrollRunCacheKeys & {
      upcoming?: (args: typeof scope & { cursor?: string }) => string;
    }).upcoming;
    expect(upcoming).toBeTypeOf("function");
    expect(upcoming?.(scope)).not.toBe(upcoming?.({ ...scope, cursor: "upcoming-page" }));
    expect(upcoming?.(scope)).not.toBe(upcoming?.({ ...scope, agencyId: "agency-2" }));
    expect(upcoming?.(scope)).not.toBe(upcoming?.({ ...scope, mode: "hha" }));
  });

  it("rejects malformed actionable detail instead of caching server capabilities", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    const args = { ...scope, runId: "run-a", activeRevisionId: "revision-a" };
    baseQuery.mockResolvedValueOnce({
      data: {
        kind: "run",
        runId: "run-a",
        activeRevisionId: "revision-a",
        capabilities: { commands: { approve_payroll: { enabled: true } } },
        approvalChallenge: "unsafe-unparsed-challenge",
      },
    });

    try {
      await expect(store.dispatch(payrollRunApi.endpoints.getPayrollRun.initiate(args)).unwrap()).rejects.toBeDefined();
      expect(payrollRunApi.endpoints.getPayrollRun.select(args)(store.getState()).data).toBeUndefined();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rejects revision-bound lazy responses that resolve a different identity", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = configureStore({
      reducer: { [payrollRunApi.reducerPath]: payrollRunApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(payrollRunApi.middleware),
    });
    const revisionArgs = { ...scope, runId: "run-a", activeRevisionId: "revision-a" };
    baseQuery
      .mockResolvedValueOnce({
        data: {
          kind: "run",
          runId: "run-a",
          activeRevisionId: "revision-b",
          revisionNumber: 2,
          items: [],
          nextCursor: null,
          hasMore: false,
        },
      })
      .mockResolvedValueOnce({
        data: { employeeId: "employee-a", activeRevisionId: "revision-b" },
      })
      .mockResolvedValueOnce({
        data: {
          kind: "run",
          runId: "run-a",
          activeRevisionId: "revision-b",
          revisionNumber: 2,
          employeeId: "employee-a",
          items: [],
          nextCursor: null,
          hasMore: false,
        },
      });

    try {
      await expect(store.dispatch(
        payrollRunApi.endpoints.listPayrollRunEmployees.initiate(revisionArgs),
      ).unwrap()).rejects.toBeDefined();
      await expect(store.dispatch(
        payrollRunApi.endpoints.getPayrollRunEmployee.initiate({
          ...revisionArgs,
          employeeId: "employee-a",
        }),
      ).unwrap()).rejects.toBeDefined();
      await expect(store.dispatch(
        payrollRunApi.endpoints.listPayrollRunEmployeeSources.initiate({
          ...revisionArgs,
          employeeId: "employee-a",
        }),
      ).unwrap()).rejects.toBeDefined();
    } finally {
      consoleError.mockRestore();
    }
  });
});
