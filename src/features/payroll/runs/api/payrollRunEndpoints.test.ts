import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  payrollRunApi,
  payrollRunCacheKeys,
  payrollRunRequests,
  type CurrentPayrollRunArgs,
} from "./payrollRunEndpoints";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const scope = {
  audience: "agency" as const,
  actorUid: "actor-1",
  agencyId: "agency-1",
};

describe("payroll run read transport", () => {
  beforeEach(() => baseQuery.mockReset());

  it("registers all nine authenticated agency read endpoints", () => {
    expect(Object.keys(payrollRunApi.endpoints)).toEqual(expect.arrayContaining([
      "getCurrentPayrollRun",
      "getCurrentPayrollEmployees",
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
      { url: "/checkPayrollAgency/payroll/agency/runs/current", method: "GET", requiresAuth: true },
      { url: "/checkPayrollAgency/payroll/agency/runs/run%2Fa", method: "GET", requiresAuth: true },
      {
        url: "/checkPayrollAgency/payroll/agency/runs/run%2Fa/employees/employee%2Fa",
        method: "GET",
        requiresAuth: true,
      },
    ]);
    const serialized = JSON.stringify(requests);
    expect(serialized).not.toContain("actor-1");
    expect(serialized).not.toContain("agency-1");
    expect(serialized).not.toContain("revision/private");
    expect(serialized).not.toMatch(/provider|environment/i);
  });

  it("sends fixed limits and only each list route's allowlisted query fields", () => {
    expect(payrollRunRequests.currentEmployees({
      ...scope,
      filter: "blocked",
      sort: "gross_desc",
      cursor: "employee-page",
    })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/current/employees",
      method: "GET",
      requiresAuth: true,
      params: { limit: 50, filter: "blocked", sort: "gross_desc", cursor: "employee-page" },
    });
    expect(payrollRunRequests.list({ ...scope, runType: "off_cycle", cursor: "run-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs",
      method: "GET",
      requiresAuth: true,
      params: { limit: 25, runType: "off_cycle", cursor: "run-page" },
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
      params: { limit: 50, filter: "included", sort: "name_asc", cursor: "employee-page" },
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
      params: { limit: 50, cursor: "source-page" },
    });
    expect(payrollRunRequests.events({ ...scope, runId: "run-a", activeRevisionId: "revision-a", cursor: "event-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/runs/run-a/events",
      method: "GET",
      requiresAuth: true,
      params: { limit: 25, cursor: "event-page" },
    });
    expect(payrollRunRequests.obligations({ ...scope, state: "operations_required", cursor: "obligation-page" })).toEqual({
      url: "/checkPayrollAgency/payroll/agency/obligations",
      method: "GET",
      requiresAuth: true,
      params: { limit: 25, state: "operations_required", cursor: "obligation-page" },
    });
  });

  it("omits optional list fields instead of sending empty or unauthorized values", () => {
    const requests = [
      payrollRunRequests.currentEmployees(scope),
      payrollRunRequests.list(scope),
      payrollRunRequests.employees({ ...scope, runId: "run-a", activeRevisionId: "revision-a" }),
      payrollRunRequests.sources({ ...scope, runId: "run-a", activeRevisionId: "revision-a", employeeId: "employee-a" }),
      payrollRunRequests.events({ ...scope, runId: "run-a", activeRevisionId: "revision-a" }),
      payrollRunRequests.obligations(scope),
    ];
    expect(requests.map(({ params }) => params)).toEqual([
      { limit: 50 },
      { limit: 25 },
      { limit: 50 },
      { limit: 50 },
      { limit: 25 },
      { limit: 25 },
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
