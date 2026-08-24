import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  superAdminPayrollRunApi,
  superAdminPayrollRunCacheKeys,
  superAdminPayrollRunRequests,
  parseNetworkPayrollRunPage,
} from "./superAdminPayrollRunEndpoints";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const selected = {
  actorUid: "super-1",
  agencyId: "atlas",
  operationalContextRevision: 4,
};

function store() {
  return configureStore({
    reducer: { [superAdminPayrollRunApi.reducerPath]: superAdminPayrollRunApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(superAdminPayrollRunApi.middleware),
  });
}

describe("Super Admin payroll run read transport", () => {
  beforeEach(() => baseQuery.mockReset());

  it("uses dedicated GET-only network and selected-agency paths", () => {
    expect(superAdminPayrollRunRequests.network({ actorUid: "super-1", cursor: "page-2" })).toEqual({
      url: "/superAdminOperations/billing/payroll-runs",
      method: "GET",
      requiresAuth: true,
      params: { limit: 25, cursor: "page-2" },
    });
    expect(superAdminPayrollRunRequests.current(selected)).toEqual({
      url: "/superAdminOperations/agencies/atlas/payroll/runs/current",
      method: "GET",
      requiresAuth: true,
    });
    expect(superAdminPayrollRunRequests.currentEmployees(selected)).toEqual({
      url: "/superAdminOperations/agencies/atlas/payroll/runs/current/employees",
      method: "GET",
      requiresAuth: true,
      params: { limit: 50 },
    });
    expect(superAdminPayrollRunRequests.currentEmployees({ ...selected, cursor: "employee-page-2" })).toEqual({
      url: "/superAdminOperations/agencies/atlas/payroll/runs/current/employees",
      method: "GET",
      requiresAuth: true,
      params: { limit: 50, cursor: "employee-page-2" },
    });
    expect(JSON.stringify(superAdminPayrollRunRequests)).not.toMatch(/post|commands|approve/i);
  });

  it("isolates caches by actor, selected agency, and trusted context revision", () => {
    expect(superAdminPayrollRunCacheKeys.current(selected)).not.toBe(
      superAdminPayrollRunCacheKeys.current({ ...selected, actorUid: "super-2" }),
    );
    expect(superAdminPayrollRunCacheKeys.currentEmployees(selected)).not.toBe(
      superAdminPayrollRunCacheKeys.currentEmployees({ ...selected, cursor: "employee-page-2" }),
    );
    expect(superAdminPayrollRunCacheKeys.current(selected)).not.toBe(
      superAdminPayrollRunCacheKeys.current({ ...selected, agencyId: "beacon" }),
    );
    expect(superAdminPayrollRunCacheKeys.current(selected)).not.toBe(
      superAdminPayrollRunCacheKeys.current({ ...selected, operationalContextRevision: 5 }),
    );
    expect(superAdminPayrollRunCacheKeys.network({ actorUid: "super-1" })).not.toBe(
      superAdminPayrollRunCacheKeys.network({ actorUid: "super-2" }),
    );
  });

  it("rejects a network projection without agency identity", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const testStore = store();
    baseQuery.mockResolvedValueOnce({ data: {
      items: [{ runId: "run-1", periodEnd: "2026-08-02" }],
      nextCursor: null,
      hasMore: false,
    } });
    try {
      await expect(testStore.dispatch(
        superAdminPayrollRunApi.endpoints.listSuperAdminNetworkPayrollRuns.initiate({ actorUid: "super-1" }),
      ).unwrap()).rejects.toBeDefined();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("rejects an identified network row with malformed financial fields", () => {
    expect(() => parseNetworkPayrollRunPage({
      items: [{
        networkRunKey: "network-1",
        environment: "sandbox",
        agencyId: "atlas",
        agencyName: "Atlas Care",
        runId: "run-1",
        runType: "regular",
        periodStart: "2026-07-20",
        periodEnd: "2026-08-02",
        payday: "2026-08-07",
        workflowState: "review",
        providerStatus: "draft",
        activeRevisionId: "revision-1",
        revisionNumber: 1,
        stale: false,
        employeeCount: 1,
        includedCount: 1,
        deferredCount: 0,
        zeroDueCount: 0,
        blockerCount: 0,
        warningCount: 0,
        totals: { totalDueCents: "10000" },
      }],
      nextCursor: null,
      hasMore: false,
    })).toThrow("Invalid Super Admin payroll response");
  });

  it("rejects oversized network cursors and payloads before caching", () => {
    expect(() => parseNetworkPayrollRunPage({
      items: [],
      nextCursor: "x".repeat(4_097),
      hasMore: true,
    })).toThrow("Invalid Super Admin payroll response");
    expect(() => parseNetworkPayrollRunPage({
      items: [],
      nextCursor: "x".repeat(500 * 1_024),
      hasMore: true,
    })).toThrow("Invalid Super Admin payroll response");
  });
});
