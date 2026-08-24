import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  legacyPayrollHistoryApi,
  legacyPayrollHistoryCacheKeys,
  legacyPayrollHistoryRequests,
  type LegacyPayrollHistoryArgs,
} from "./legacyPayrollHistoryEndpoints";

const baseQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/baseQuery", () => ({ customBaseQuery: baseQuery }));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };

describe("legacy payroll history read transport", () => {
  beforeEach(() => baseQuery.mockReset());

  it("exposes only bounded GET list and detail endpoints", () => {
    expect(Object.keys(legacyPayrollHistoryApi.endpoints)).toEqual([
      "listLegacyPayrollHistory",
      "getLegacyPayrollInvoice",
    ]);
    expectTypeOf<LegacyPayrollHistoryArgs["audience"]>().toEqualTypeOf<"agency">();
    expect(legacyPayrollHistoryRequests.list({
      ...scope,
      startDate: "2026-06-01",
      endDate: "2026-08-24",
      status: "paid",
      employeeId: "employee/a",
      mode: "hha",
      cursor: "page-2",
    })).toEqual({
      url: "/billing/payroll/invoices",
      method: "GET",
      requiresAuth: true,
      params: {
        startDate: "2026-06-01",
        endDate: "2026-08-24",
        limit: 25,
        status: "paid",
        employeeId: "employee/a",
        mode: "hha",
        cursor: "page-2",
      },
    });
    expect(legacyPayrollHistoryRequests.detail({ ...scope, invoiceId: "invoice/a" })).toEqual({
      url: "/billing/payroll/invoices/invoice%2Fa",
      method: "GET",
      requiresAuth: true,
    });
  });

  it("omits optional filters and isolates cache entries by trusted scope and cursor", () => {
    const first = {
      ...scope,
      startDate: "2026-06-01",
      endDate: "2026-08-24",
    };
    expect(legacyPayrollHistoryRequests.list(first).params).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-08-24",
      limit: 25,
    });
    expect(legacyPayrollHistoryCacheKeys.list(first)).not.toBe(
      legacyPayrollHistoryCacheKeys.list({ ...first, cursor: "page-2" }),
    );
    expect(legacyPayrollHistoryCacheKeys.list(first)).not.toBe(
      legacyPayrollHistoryCacheKeys.list({ ...first, actorUid: "actor-2" }),
    );
  });

  it("unwraps the read-only legacy response envelope", async () => {
    baseQuery.mockResolvedValue({
      data: {
        success: true,
        data: { items: [], nextCursor: null, hasMore: false },
      },
    });
    const store = configureStore({
      reducer: { [legacyPayrollHistoryApi.reducerPath]: legacyPayrollHistoryApi.reducer },
      middleware: (getDefault) => getDefault().concat(legacyPayrollHistoryApi.middleware),
    });
    const result = await store.dispatch(legacyPayrollHistoryApi.endpoints.listLegacyPayrollHistory.initiate({
      ...scope,
      startDate: "2026-06-01",
      endDate: "2026-08-24",
    })).unwrap();
    expect(result).toEqual({ items: [], nextCursor: null, hasMore: false });
  });
});
