import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

import axiosClient from "@/lib/axios";
import {
  cancelBillingClaim,
  createBillingClaim,
  getBillingClaimById,
  getClaimsDashboard,
  listBillingClaims,
  listReadyToClaim,
  updateBillingClaimStatus,
} from "@/lib/api/claims";
import {
  cancelOutOfPocketInvoice,
  createOutOfPocketInvoice,
  getOutOfPocketInvoice,
  listOutOfPocketInvoices,
  listOutOfPocketReady,
  sendOutOfPocketInvoice,
} from "@/lib/api/out-of-pocket";
import {
  createStaffTimesheet,
  getStaffTimesheet,
  listMyStaffTimesheets,
  listStaffTimesheets,
  reviewStaffTimesheet,
  updateStaffTimesheet,
} from "@/lib/api/staff-timesheets";
import { generateBillingReport, listBillingRecords } from "@/lib/api/billing";
import {
  billingExpenseTag,
  billingExpensesApi,
  buildExpensesDashboardRequest,
  buildExpensesListRequest,
  buildExpensesMutationRequest,
  serializeExpensesQueryArgs,
} from "@/lib/api/billing-expenses";
import {
  billingRecordTag,
  buildBillingRecordRequest,
  buildBillingReportRequest,
  serializeBillingRecordArgs,
} from "@/pages/agency/billing-and-approvals/api";
import {
  operationalBillingCacheKey,
  operationalAgencyId,
  withOperationalAgency,
} from "@/lib/operational-agency/request";
import {
  agencyBillingRoutes,
  superAdminBillingRoutes,
} from "@/lib/operational-agency/routes";

vi.mock("@/lib/axios", () => ({
  default: Object.assign(vi.fn(), {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }),
}));

const mockedAxios = axiosClient as unknown as ReturnType<typeof vi.fn> & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("operational billing request context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the canonical agency last and rejects an empty operational agency", () => {
    expect(
      withOperationalAgency(
        { agencyId: "agency-a" },
        { agencyId: "forged-agency", status: "draft" },
      ),
    ).toEqual({ status: "draft", agencyId: "agency-a" });

    expect(() => withOperationalAgency({ agencyId: "   " }, { status: "draft" })).toThrow(
      "Operational billing agencyId is required",
    );
    expect(() => operationalAgencyId({ agencyId: "   " })).toThrow(
      "Operational billing agencyId is required",
    );
  });

  it("fails closed before a mutation can send an empty agency", async () => {
    await expect(
      cancelBillingClaim({ context: { agencyId: "  " }, claimId: "claim-1" }),
    ).rejects.toThrow("Operational billing agencyId is required");
    expect(mockedAxios.delete).not.toHaveBeenCalled();
    expect(() =>
      buildExpensesMutationRequest("approve", { agencyId: "", expenseId: "exp-1" }),
    ).toThrow("Operational billing agencyId is required");
  });

  it("scopes a claims request and cache key to the selected agency", async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          overview: {},
          claimsByStatus: { total: 0, segments: [] },
          rejectionReasons: { total: 0, segments: [] },
        },
      },
    } as never);

    const query = { startDate: "2026-07-01", endDate: "2026-07-31" };
    await getClaimsDashboard({ context: { agencyId: "agency-a" }, query });

    expect(mockedAxios.get).toHaveBeenCalledWith("/billing/claims/dashboard", {
      params: { ...query, agencyId: "agency-a" },
    });
    expect(operationalBillingCacheKey("claims-dashboard", { agencyId: "agency-a" }, query)).not.toBe(
      operationalBillingCacheKey("claims-dashboard", { agencyId: "agency-b" }, query),
    );
  });

  it("builds actor-aware billing routes while preserving search state", () => {
    expect(agencyBillingRoutes.index("agencyId=agency-a")).toBe(
      "/agency/billing?agencyId=agency-a",
    );
    expect(agencyBillingRoutes.financialOverview()).toBe(
      "/agency/billing/financial-overview",
    );
    expect(superAdminBillingRoutes.payroll("?agencyId=agency-a")).toBe(
      "/super-admin/billing/payroll-management?agencyId=agency-a",
    );
    expect(superAdminBillingRoutes.claims()).toBe("/super-admin/billing/claims");
    expect(superAdminBillingRoutes.expenses()).toBe("/super-admin/billing/expenses");
    expect(superAdminBillingRoutes.timesheets()).toBe(
      "/super-admin/billing/staff-timesheets",
    );
  });

  it("scopes every claims read and mutation to the context agency", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, data: { claims: [], rows: [] } } } as never);
    mockedAxios.post.mockResolvedValue({ data: { success: true, data: { id: "claim-1" } } } as never);
    mockedAxios.patch.mockResolvedValue({ data: { success: true } } as never);
    mockedAxios.delete.mockResolvedValue({ data: { success: true } } as never);
    const context = { agencyId: "agency-a" };
    const range = { startDate: "2026-07-01", endDate: "2026-07-31" };

    await listReadyToClaim({ context, query: { limit: 25 } });
    await listBillingClaims({ context, query: range });
    await getBillingClaimById({ context, claimId: "claim-1" });
    await createBillingClaim({
      context,
      payload: { clientId: "client-1", shiftIds: ["shift-1"], serviceCode: "SVC" },
    });
    await updateBillingClaimStatus({
      context,
      claimId: "claim-1",
      payload: { status: "paid" },
    });
    await cancelBillingClaim({ context, claimId: "claim-1" });

    expect(mockedAxios.get).toHaveBeenNthCalledWith(1, "/billing/claims/ready-to-claim", {
      params: { limit: 25, agencyId: "agency-a" },
    });
    expect(mockedAxios.get).toHaveBeenNthCalledWith(2, "/billing/claims", {
      params: { ...range, agencyId: "agency-a" },
    });
    expect(mockedAxios.get).toHaveBeenNthCalledWith(3, "/billing/claims/claim-1", {
      params: { agencyId: "agency-a" },
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/billing/claims",
      { clientId: "client-1", shiftIds: ["shift-1"], serviceCode: "SVC", agencyId: "agency-a" },
      { params: { agencyId: "agency-a" } },
    );
    expect(mockedAxios.patch).toHaveBeenCalledWith(
      "/billing/claims/claim-1/status",
      { status: "paid" },
      { params: { agencyId: "agency-a" } },
    );
    expect(mockedAxios.delete).toHaveBeenCalledWith("/billing/claims/claim-1", {
      params: { agencyId: "agency-a" },
    });
  });

  it("rejects forged agency IDs in claims query and mutation payloads", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, data: { claims: [] } } } as never);
    mockedAxios.patch.mockResolvedValue({ data: { success: true } } as never);

    await listBillingClaims({
      context: { agencyId: "agency-a" },
      query: {
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        agencyId: "forged-agency",
      } as never,
    });
    await updateBillingClaimStatus({
      context: { agencyId: "agency-a" },
      claimId: "claim-1",
      payload: { status: "paid", agencyId: "forged-agency" } as never,
    });

    expect(mockedAxios.get).toHaveBeenCalledWith("/billing/claims", {
      params: {
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        agencyId: "agency-a",
      },
    });
    expect(mockedAxios.patch).toHaveBeenCalledWith(
      "/billing/claims/claim-1/status",
      { status: "paid" },
      { params: { agencyId: "agency-a" } },
    );
  });

  it("scopes out-of-pocket reads and mutations without trusting a body agency", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, data: { rows: [], invoices: [] } } } as never);
    mockedAxios.post.mockResolvedValue({ data: { success: true, data: { id: "oop-1" } } } as never);
    mockedAxios.delete.mockResolvedValue({ data: { success: true } } as never);
    const context = { agencyId: "agency-a" };

    await listOutOfPocketReady({ context, query: { limit: 10 } });
    await listOutOfPocketInvoices({ context, query: { limit: 10 } });
    await getOutOfPocketInvoice({ context, invoiceId: "oop-1" });
    await createOutOfPocketInvoice({
      context,
      payload: { clientId: "client-1", shiftIds: ["shift-1"] },
    });
    await sendOutOfPocketInvoice({ context, invoiceId: "oop-1" });
    await cancelOutOfPocketInvoice({ context, invoiceId: "oop-1" });

    for (const call of mockedAxios.get.mock.calls) {
      expect(call[1]).toMatchObject({ params: expect.objectContaining({ agencyId: "agency-a" }) });
    }
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      1,
      "/billing/out-of-pocket/invoices",
      { clientId: "client-1", shiftIds: ["shift-1"] },
      { params: { agencyId: "agency-a" } },
    );
    expect(mockedAxios.post).toHaveBeenNthCalledWith(
      2,
      "/billing/out-of-pocket/invoices/oop-1/send",
      undefined,
      { params: { agencyId: "agency-a" } },
    );
    expect(mockedAxios.delete).toHaveBeenCalledWith("/billing/out-of-pocket/invoices/oop-1", {
      params: { agencyId: "agency-a" },
    });
  });

  it("strips forged agency IDs from out-of-pocket query and create bodies", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, data: { invoices: [] } } } as never);
    mockedAxios.post.mockResolvedValue({ data: { success: true, data: { id: "oop-1" } } } as never);

    await listOutOfPocketInvoices({
      context: { agencyId: "agency-a" },
      query: { limit: 10, agencyId: "forged-agency" } as never,
    });
    await createOutOfPocketInvoice({
      context: { agencyId: "agency-a" },
      payload: {
        clientId: "client-1",
        shiftIds: ["shift-1"],
        agencyId: "forged-agency",
      } as never,
    });

    expect(mockedAxios.get).toHaveBeenCalledWith("/billing/out-of-pocket/invoices", {
      params: { limit: 10, agencyId: "agency-a" },
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/billing/out-of-pocket/invoices",
      { clientId: "client-1", shiftIds: ["shift-1"] },
      { params: { agencyId: "agency-a" } },
    );
  });

  it("scopes billing-side staff timesheets while preserving employee create/edit signatures", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, data: { timesheets: [] } } } as never);
    mockedAxios.post.mockResolvedValue({ data: { success: true, data: { id: "timesheet-1", status: "draft" } } } as never);
    mockedAxios.patch.mockResolvedValue({ data: { success: true, data: { id: "timesheet-1", status: "draft" } } } as never);
    const context = { agencyId: "agency-a" };

    await listStaffTimesheets({ context, query: { scope: "agency" } });
    await getStaffTimesheet({ context, timesheetId: "timesheet-1" });
    await reviewStaffTimesheet({ context, timesheetId: "timesheet-1", status: "approved" });

    expect(mockedAxios.get).toHaveBeenNthCalledWith(1, "/agencyStaff/timesheets", {
      params: { scope: "agency", agencyId: "agency-a" },
    });
    expect(mockedAxios.get).toHaveBeenNthCalledWith(2, "/agencyStaff/timesheets/timesheet-1", {
      params: { agencyId: "agency-a" },
    });
    expect(mockedAxios.patch).toHaveBeenCalledWith(
      "/agencyStaff/timesheets/timesheet-1/status",
      { status: "approved" },
      { params: { agencyId: "agency-a" } },
    );
    vi.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ data: { success: true, data: { id: "draft-1", status: "draft" } } } as never);
    mockedAxios.patch.mockResolvedValue({ data: { success: true, data: { id: "draft-1", status: "draft" } } } as never);
    const employeePayload = {
      entries: [],
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      mode: "ddd" as const,
      status: "draft" as const,
    };
    await createStaffTimesheet(employeePayload);
    await updateStaffTimesheet("draft-1", employeePayload);
    expect(mockedAxios.post).toHaveBeenCalledWith("/agencyStaff/timesheets", employeePayload);
    expect(mockedAxios.patch).toHaveBeenCalledWith("/agencyStaff/timesheets/draft-1", employeePayload);
  });

  it("separates employee-owned timesheet scope from operational agency mutations", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, data: { timesheets: [] } } } as never);

    await listMyStaffTimesheets({
      scope: "agency",
      agencyId: "forged-agency",
      status: "draft",
    } as never);

    expect(mockedAxios.get).toHaveBeenCalledWith("/agencyStaff/timesheets", {
      params: { status: "draft", scope: "mine" },
    });
  });

  it("scopes legacy billing records and generated reports", async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: true, records: [], total: 0, count: 0 } } as never);
    mockedAxios.post.mockResolvedValue({ data: { success: true, reportUrl: "/report.pdf" } } as never);
    const context = { agencyId: "agency-a" };
    await listBillingRecords({ context, query: { agencyId: "forged", billingStatus: "pending" } });
    await generateBillingReport({ context, recordIds: ["record-1"] });
    expect(mockedAxios.get).toHaveBeenCalledWith("/billing", {
      params: { billingStatus: "pending", agencyId: "agency-a" },
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/billing/generate-report",
      { recordIds: ["record-1"], agencyId: "agency-a" },
      { params: { agencyId: "agency-a" } },
    );
  });

  it("includes agencyId in expense request serialization and cache tags", () => {
    const a = { agencyId: "agency-a", startDate: "2026-07-01", endDate: "2026-07-31" };
    const b = { ...a, agencyId: "agency-b" };
    expect(buildExpensesDashboardRequest(a).url).toContain("agencyId=agency-a");
    expect(buildExpensesListRequest({ ...a, status: "pending" }).url).toContain(
      "agencyId=agency-a",
    );
    expect(buildExpensesMutationRequest("approve", { agencyId: "agency-a", expenseId: "exp-1" }).url)
      .toContain("agencyId=agency-a");
    expect(serializeExpensesQueryArgs(a)).not.toEqual(serializeExpensesQueryArgs(b));
    expect(serializeExpensesQueryArgs({ ...a, limit: 25 })).not.toEqual(
      serializeExpensesQueryArgs({ ...a, limit: 100 }),
    );
    expect(billingExpenseTag("ExpensesList", "agency-a")).not.toEqual(
      billingExpenseTag("ExpensesList", "agency-b"),
    );
  });

  it("requests and merges the next expense page without crossing agency caches", async () => {
    const requestUrls: string[] = [];
    mockedAxios.mockImplementation(async ({ url }: { url: string }) => {
      requestUrls.push(url);
      const parsed = new URL(url, "https://example.test");
      const agencyId = parsed.searchParams.get("agencyId");
      const page = Number(parsed.searchParams.get("page"));
      return {
        data: {
          success: true,
          data: {
            expenses: [{ id: `${agencyId}-page-${page}` }],
            total: 2,
            page,
            limit: 1,
            hasMore: page < 2,
          },
        },
      };
    });
    const store = configureStore({
      reducer: { [billingExpensesApi.reducerPath]: billingExpensesApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(billingExpensesApi.middleware),
    });
    const base = {
      agencyId: "agency-a",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      limit: 1,
    };

    await store.dispatch(billingExpensesApi.endpoints.getAgencyExpenses.initiate({
      ...base,
      page: 1,
    })).unwrap();
    await store.dispatch(billingExpensesApi.endpoints.getAgencyExpenses.initiate({
      ...base,
      page: 2,
    })).unwrap();
    await store.dispatch(billingExpensesApi.endpoints.getAgencyExpenses.initiate({
      ...base,
      agencyId: "agency-b",
      page: 1,
    })).unwrap();

    expect(requestUrls).toEqual([
      expect.stringContaining("agencyId=agency-a"),
      expect.stringContaining("agencyId=agency-a"),
      expect.stringContaining("agencyId=agency-b"),
    ]);
    expect(
      billingExpensesApi.endpoints.getAgencyExpenses.select({ ...base, page: 2 })(
        store.getState(),
      ).data?.expenses,
    ).toEqual([{ id: "agency-a-page-1" }, { id: "agency-a-page-2" }]);
    expect(
      billingExpensesApi.endpoints.getAgencyExpenses.select({
        ...base,
        agencyId: "agency-b",
        page: 1,
      })(store.getState()).data?.expenses,
    ).toEqual([{ id: "agency-b-page-1" }]);
  });

  it("scopes RTK billing records, reports, cache keys, and tags", () => {
    const contextA = { agencyId: "agency-a" };
    const agencyA = {
      context: contextA,
      query: { page: 1, agencyId: "forged-agency" },
    } as unknown as Parameters<typeof buildBillingRecordRequest>[0];
    const agencyB = { context: { agencyId: "agency-b" }, query: { page: 1 } };
    expect(buildBillingRecordRequest(agencyA).url).toContain("agencyId=agency-a");
    expect(buildBillingReportRequest({ context: contextA, recordIds: ["record-1"] }))
      .toMatchObject({
        url: "/billing/generate-report?agencyId=agency-a",
        data: { recordIds: ["record-1"], agencyId: "agency-a" },
      });
    expect(serializeBillingRecordArgs(agencyA)).not.toEqual(serializeBillingRecordArgs(agencyB));
    expect(billingRecordTag("agency-a")).not.toEqual(billingRecordTag("agency-b"));
  });
});
