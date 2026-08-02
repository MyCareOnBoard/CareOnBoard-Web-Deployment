import { type AxiosRequestConfig } from "axios";
import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { axiosAdapter, testAxiosClient } = vi.hoisted(() => {
  const adapter = vi.fn();
  return {
    axiosAdapter: adapter,
    testAxiosClient: {
      get: (url: string, config: AxiosRequestConfig) => adapter({ ...config, url }),
    },
  };
});

vi.mock("@/lib/axios", () => ({ default: testAxiosClient }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));

import {
  NETWORK_BILLING_KEEP_UNUSED_DATA_FOR,
  NETWORK_BILLING_QUERY_OPTIONS,
  networkBillingApi,
  type ClaimsNetworkBillingArgs,
  type ExpensesNetworkBillingArgs,
  type NetworkBillingOptionsArgs,
  type OverviewNetworkBillingArgs,
  type PayrollNetworkBillingArgs,
  type TimesheetsNetworkBillingArgs,
} from "./network-billing";
import { networkBillingLogoutResetMiddleware } from "@/store/redux/store";
import { logoutUser } from "@/utils/auth/store/authSlice";

type RequestConfig = AxiosRequestConfig & { url?: string };

const baseArgs = {
  actorUid: "super-admin-a",
  environment: "staging",
  scope: { kind: "network" as const },
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  tab: "saved" as const,
  sort: "createdAt:desc" as const,
  limit: 25,
};

const savedClaim = {
  id: "claim-1",
  kind: "claim",
  agencyId: "agency-a",
  agencyName: "Agency A",
  amount: 25,
};
const readyClaim = {
  id: "shift-1",
  sourceType: "shift",
  sourceId: "shift-1",
  agencyId: "agency-a",
  agencyName: "Agency A",
  serviceCode: "SVC",
  needsClaim: true,
  needsInvoice: false,
};

const claimsPage = {
  success: true,
  data: {
    scope: { kind: "global", agencyCount: 1 },
    page: { rows: [savedClaim], total: 1, nextCursor: null, hasMore: false },
  },
};

const timingMeta = { durationMs: 4, resultCount: 1, branchCount: 1 };
const emptyPage = { rows: [], total: 0, nextCursor: null, hasMore: false };
const claimsSummary = {
  overview: {
    submitted: { count: 1, amount: 25 },
    pending: { count: 1, amount: 25 },
    paid: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    atRisk: { count: 0, amount: 0 },
  },
  claimsByStatus: { total: 1, segments: [{ status: "pending", count: 1 }] },
  rejectionReasons: { total: 0, segments: [] },
  meta: { atRiskDays: 14, evaluatedAt: "2026-08-02T00:00:00.000Z" },
};
const payrollRow = {
  id: "payroll-1",
  kind: "payrollInvoice",
  agencyId: "agency-a",
  agencyName: "Agency A",
  staffKey: "agency-a:staff-a",
  grossAmount: 50,
  totalHours: 2,
  mode: null,
};
const payrollSummary = {
  overview: { savedInvoices: { count: 1, exact: true } },
  meta: { evaluatedAt: "2026-08-02T00:00:00.000Z", totalsExact: true },
};
const expenseRow = {
  id: "expense-1",
  agencyId: "agency-a",
  agencyName: "Agency A",
  staffKey: "agency-a:staff-a",
  status: "pending",
  mode: null,
  amount: 5,
};
const expenseSummary = {
  overview: {
    submitted: { count: 1, amount: 5 },
    awaitingReview: { count: 1, amount: 5 },
    approved: { count: 0, amount: 0 },
    declined: { count: 0, amount: 0 },
  },
  expensesByStatus: { total: 1, segments: [{ status: "pending", count: 1 }] },
  meta: { evaluatedAt: "2026-08-02T00:00:00.000Z", totalsExact: true, branchCount: 1 },
};
const timesheetRow = {
  id: "timesheet-1",
  agencyId: "agency-a",
  agencyName: "Agency A",
  staffKey: "agency-a:staff-a",
  status: "pending",
  mode: null,
  staffUid: null,
  staffName: null,
  periodStart: null,
  periodEnd: null,
  payrollInvoiceId: null,
  createdAt: null,
  payPreview: null,
};
const overviewData = {
  scope: { kind: "global", agencyCount: 1 },
  periods: {
    current: { start: "2026-07-01", end: "2026-07-31" },
    previous: { start: "2026-05-31", end: "2026-06-30" },
  },
  current: { claims: { count: 1, amount: 25 }, payroll: null, expenses: null },
  previous: { claims: null, payroll: null, expenses: null },
  recentActivity: [],
  meta: { totalsExact: true, branchCount: 1 },
};
const option = {
  id: "client-1",
  agencyId: "agency-a",
  agencyName: "Agency A",
  name: "Client",
  kind: "client",
};

const queryContext = {
  actorUid: "super-admin-a",
  environment: "staging",
  scope: { kind: "network" as const },
};
const claimsSavedArgs: ClaimsNetworkBillingArgs = { ...queryContext, startDate: "2026-07-01", endDate: "2026-07-31", tab: "saved", sort: "createdAt:desc", limit: 25 };
const payrollSavedArgs: PayrollNetworkBillingArgs = { ...queryContext, startDate: "2026-07-01", endDate: "2026-07-31", tab: "saved", status: "pending", limit: 25 };
const expensesPendingArgs: ExpensesNetworkBillingArgs = { ...queryContext, startDate: "2026-07-01", endDate: "2026-07-31", tab: "pending", status: "pending", limit: 25 };
const timesheetsArgs: TimesheetsNetworkBillingArgs = { ...queryContext, startDate: "2026-07-01", endDate: "2026-07-31", tab: "list", status: "pending", limit: 25 };
const overviewArgs: OverviewNetworkBillingArgs = { ...queryContext, startDate: "2026-07-01", endDate: "2026-07-31", tab: "overview" };
const optionsArgs: NetworkBillingOptionsArgs = { ...queryContext, kind: "client", q: "cli" };

// Compile-time contract: entity selections are paired and tab-specific filters cannot cross branches.
// @ts-expect-error clientId requires clientAgencyId
const invalidClientOnly: ClaimsNetworkBillingArgs = { ...claimsSavedArgs, clientId: "client-a" };
// @ts-expect-error clientAgencyId requires clientId
const invalidClientAgencyOnly: ClaimsNetworkBillingArgs = { ...claimsSavedArgs, clientAgencyId: "agency-a" };
// @ts-expect-error employeeId requires employeeAgencyId
const invalidStaffOnly: PayrollNetworkBillingArgs = { ...payrollSavedArgs, employeeId: "staff-a" };
// @ts-expect-error employeeAgencyId requires employeeId
const invalidStaffAgencyOnly: TimesheetsNetworkBillingArgs = { ...timesheetsArgs, employeeAgencyId: "agency-a" };
// @ts-expect-error saved claims do not accept mode
const invalidSavedClaimsMode: ClaimsNetworkBillingArgs = { ...claimsSavedArgs, mode: "ddd" };
// @ts-expect-error ready claims do not accept saved status
const invalidReadyClaimsStatus: ClaimsNetworkBillingArgs = { ...queryContext, tab: "ready", status: "pending" };
// @ts-expect-error due payroll does not accept status
const invalidDuePayrollStatus: PayrollNetworkBillingArgs = { ...payrollSavedArgs, tab: "due", status: "paid" };
// @ts-expect-error pending expenses cannot select a history status
const invalidPendingExpenseStatus: ExpensesNetworkBillingArgs = { ...expensesPendingArgs, status: "approved" };
// @ts-expect-error timesheets expose only the list tab
const invalidTimesheetTab: TimesheetsNetworkBillingArgs = { ...timesheetsArgs, tab: "saved" };
// @ts-expect-error overview does not accept entity filters
const invalidOverviewEntity: OverviewNetworkBillingArgs = { ...overviewArgs, employeeId: "staff-a", employeeAgencyId: "agency-a" };
// @ts-expect-error options expose only client and staff kinds
const invalidOptionKind: NetworkBillingOptionsArgs = { ...optionsArgs, kind: "agency" };
void [
  invalidClientOnly,
  invalidClientAgencyOnly,
  invalidStaffOnly,
  invalidStaffAgencyOnly,
  invalidSavedClaimsMode,
  invalidReadyClaimsStatus,
  invalidDuePayrollStatus,
  invalidPendingExpenseStatus,
  invalidTimesheetTab,
  invalidOverviewEntity,
  invalidOptionKind,
];

function createStore() {
  return configureStore({
    reducer: { [networkBillingApi.reducerPath]: networkBillingApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(networkBillingApi.middleware),
  });
}

function respond(data: unknown = claimsPage) {
  axiosAdapter.mockImplementation((config: RequestConfig) => Promise.resolve({
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  }));
}

type NetworkTestStore = ReturnType<typeof createStore>;
type MalformedEndpoint =
  | "claimsBootstrap"
  | "claimsPage"
  | "payrollBootstrap"
  | "payrollPage"
  | "expensesBootstrap"
  | "expensesPage"
  | "timesheetsPage"
  | "overview"
  | "options";

function dispatchEndpoint(store: NetworkTestStore, endpoint: MalformedEndpoint): Promise<unknown> {
  switch (endpoint) {
    case "claimsBootstrap": return store.dispatch(networkBillingApi.endpoints.getClaimsBootstrap.initiate(claimsSavedArgs)).unwrap();
    case "claimsPage": return store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(claimsSavedArgs)).unwrap();
    case "payrollBootstrap": return store.dispatch(networkBillingApi.endpoints.getPayrollBootstrap.initiate(payrollSavedArgs)).unwrap();
    case "payrollPage": return store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate(payrollSavedArgs)).unwrap();
    case "expensesBootstrap": return store.dispatch(networkBillingApi.endpoints.getExpensesBootstrap.initiate(expensesPendingArgs)).unwrap();
    case "expensesPage": return store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate(expensesPendingArgs)).unwrap();
    case "timesheetsPage": return store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate(timesheetsArgs)).unwrap();
    case "overview": return store.dispatch(networkBillingApi.endpoints.getOverviewBootstrap.initiate(overviewArgs)).unwrap();
    case "options": return store.dispatch(networkBillingApi.endpoints.searchBillingOptions.initiate(optionsArgs)).unwrap();
  }
}

const claimsBootstrapResponse = {
  success: true,
  data: { ...claimsPage.data, summary: claimsSummary },
};
const payrollPageResponse = {
  success: true,
  data: { scope: { kind: "global", agencyCount: 1 }, page: { ...emptyPage, rows: [payrollRow], total: 1 } },
  meta: timingMeta,
};
const payrollBootstrapResponse = {
  ...payrollPageResponse,
  data: { ...payrollPageResponse.data, summary: payrollSummary },
};
const expensesPageResponse = {
  success: true,
  data: {
    scope: { kind: "global", agencyCount: 1 },
    page: { ...emptyPage, rows: [expenseRow], total: 1, loadedCount: 1, totalsExact: true },
    meta: { branchCount: 1 },
  },
  meta: timingMeta,
};
const expensesBootstrapResponse = {
  ...expensesPageResponse,
  data: { ...expensesPageResponse.data, summary: expenseSummary },
};
const overviewResponse = { success: true, data: overviewData, meta: timingMeta };
const optionsResponse = { success: true, data: [option] };

const malformedResponses: Array<{ name: string; endpoint: MalformedEndpoint; response: unknown }> = [
  { name: "scope missing kind", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, scope: { agencyCount: 1 } } } },
  { name: "scope with an extra agency list", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, scope: { kind: "global", agencyCount: 1, agencyIds: ["agency-a"] } } } },
  { name: "non-integer page total", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, total: 1.5 } } } },
  { name: "negative nested summary count", endpoint: "claimsBootstrap", response: { ...claimsBootstrapResponse, data: { ...claimsBootstrapResponse.data, summary: { ...claimsSummary, overview: { ...claimsSummary.overview, submitted: { count: -1, amount: 25 } } } } } },
  { name: "non-opaque cursor", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, nextCursor: "not/a/cursor", hasMore: true } } } },
  { name: "non-string agency field", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, rows: [{ ...savedClaim, agencyId: 42 }] } } } },
  { name: "negative optional loaded count", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, loadedCount: -1 } } } },
  { name: "extra partial page metadata", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, partialData: { reason: "partial", exactTotalsAvailable: false, private: true } } } } },
  { name: "claims row with both discriminators", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, rows: [{ ...savedClaim, sourceType: "shift" }] } } } },
  { name: "saved claim optional field with the wrong type", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, rows: [{ ...savedClaim, claimNumber: 42 }] } } } },
  { name: "ready claim optional field with the wrong type", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, rows: [{ ...readyClaim, coverage: 42 }] } } } },
  { name: "payroll optional field with the wrong type", endpoint: "payrollPage", response: { ...payrollPageResponse, data: { ...payrollPageResponse.data, page: { ...payrollPageResponse.data.page, rows: [{ ...payrollRow, invoiceNumber: 42 }] } } } },
  { name: "timesheet nested preview with the wrong type", endpoint: "timesheetsPage", response: { success: true, data: { scope: { kind: "global", agencyCount: 1 }, page: { ...emptyPage, rows: [{ ...timesheetRow, payPreview: { billingType: "hourly", billingRate: "20", totalHours: 2, grossAmount: 40 } }] } }, meta: timingMeta } },
  { name: "expense optional field with the wrong type", endpoint: "expensesPage", response: { ...expensesPageResponse, data: { ...expensesPageResponse.data, page: { ...expensesPageResponse.data.page, rows: [{ ...expenseRow, employeeName: 42 }] } } } },
  { name: "page with an unsupported key", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, page: { ...claimsPage.data.page, private: true } } } },
  { name: "claims bootstrap summary missing metadata", endpoint: "claimsBootstrap", response: { ...claimsBootstrapResponse, data: { ...claimsBootstrapResponse.data, summary: { overview: claimsSummary.overview, claimsByStatus: claimsSummary.claimsByStatus, rejectionReasons: claimsSummary.rejectionReasons } } } },
  { name: "payroll bootstrap malformed saved summary", endpoint: "payrollBootstrap", response: { ...payrollBootstrapResponse, data: { ...payrollBootstrapResponse.data, summary: { ...payrollSummary, overview: { savedInvoices: { count: "1", exact: true } } } } } },
  { name: "expenses bootstrap malformed metric", endpoint: "expensesBootstrap", response: { ...expensesBootstrapResponse, data: { ...expensesBootstrapResponse.data, summary: { ...expenseSummary, overview: { ...expenseSummary.overview, submitted: { count: 1, amount: Number.POSITIVE_INFINITY } } } } } },
  { name: "list response with unexpected summary", endpoint: "claimsPage", response: { ...claimsPage, data: { ...claimsPage.data, summary: claimsSummary } } },
  { name: "outer envelope with an extra key", endpoint: "claimsPage", response: { ...claimsPage, private: true } },
  { name: "timed endpoint missing outer metadata", endpoint: "payrollPage", response: { success: true, data: payrollPageResponse.data } },
  { name: "timing metadata with unsupported key", endpoint: "payrollPage", response: { ...payrollPageResponse, meta: { ...timingMeta, requestId: "secret" } } },
  { name: "timing metadata with a negative result count", endpoint: "payrollPage", response: { ...payrollPageResponse, meta: { ...timingMeta, resultCount: -1 } } },
  { name: "overview missing previous period", endpoint: "overview", response: { ...overviewResponse, data: { ...overviewData, periods: { current: overviewData.periods.current } } } },
  { name: "overview amount domain with an extra key", endpoint: "overview", response: { ...overviewResponse, data: { ...overviewData, current: { ...overviewData.current, claims: { count: 1, amount: 25, private: true } } } } },
  { name: "overview activity with an extra field", endpoint: "overview", response: { ...overviewResponse, data: { ...overviewData, recentActivity: [{ id: "activity-1", kind: "claim", agencyId: "agency-a", agencyName: "Agency A", amount: 25, status: null, date: null, private: true }] } } },
  { name: "overview partial errors with an unknown domain", endpoint: "overview", response: { ...overviewResponse, data: { ...overviewData, partialErrors: { private: "unavailable" } } } },
  { name: "overview metadata with an extra key", endpoint: "overview", response: { ...overviewResponse, data: { ...overviewData, meta: { ...overviewData.meta, requestId: "secret" } } } },
  { name: "option row with an extra key", endpoint: "options", response: { ...optionsResponse, data: [{ ...option, private: true }] } },
  { name: "options envelope with timing metadata", endpoint: "options", response: { ...optionsResponse, meta: timingMeta } },
];

describe("network billing API", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    respond();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the network claims path and preserves server-supported query params", async () => {
    const store = createStore();

    await expect(store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({
      ...baseArgs,
      status: "pending",
      clientId: "client-a",
      clientAgencyId: "agency-a",
      cursor: "cursorA",
    })).unwrap()).resolves.toEqual(claimsPage.data);

    const request = axiosAdapter.mock.calls[0][0] as RequestConfig;
    expect(request.url).toBe("/superAdminOperations/billing/claims");
    expect(request.params).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      tab: "saved",
      sort: "createdAt:desc",
      limit: 25,
      status: "pending",
      clientId: "client-a",
      clientAgencyId: "agency-a",
      cursor: "cursorA",
    });
    expect(NETWORK_BILLING_QUERY_OPTIONS).toEqual({ refetchOnMountOrArgChange: 30 });
  });

  it("uses endpoint-specific outbound parameter allowlists for all nine reads", async () => {
    const store = createStore();
    const page = (rows: unknown[]) => ({ scope: { kind: "global", agencyCount: 1 }, page: { rows, total: null, nextCursor: null, hasMore: false } });
    const responses = [
      { success: true, data: { ...page([savedClaim]), summary: claimsSummary } },
      { success: true, data: page([savedClaim]) },
      { success: true, data: { ...page([payrollRow]), summary: payrollSummary }, meta: timingMeta },
      { success: true, data: page([payrollRow]), meta: timingMeta },
      { success: true, data: { ...page([expenseRow]), summary: expenseSummary, meta: { branchCount: 1 } }, meta: timingMeta },
      { success: true, data: { ...page([expenseRow]), meta: { branchCount: 1 } }, meta: timingMeta },
      { success: true, data: page([timesheetRow]), meta: timingMeta },
      { success: true, data: overviewData, meta: timingMeta },
      { success: true, data: [option] },
    ];
    axiosAdapter.mockImplementation((config: RequestConfig) => Promise.resolve({ data: responses.shift(), status: 200, statusText: "OK", headers: {}, config }));

    await Promise.all([
      store.dispatch(networkBillingApi.endpoints.getClaimsBootstrap.initiate({ ...baseArgs, mode: "ddd", employeeId: "staff-a", employeeAgencyId: "agency-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...baseArgs, mode: "ddd", employeeId: "staff-a", employeeAgencyId: "agency-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollBootstrap.initiate({ ...baseArgs, tab: "saved", status: "paid", clientId: "client-a", clientAgencyId: "agency-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate({ ...baseArgs, tab: "due", mode: "ddd", employeeId: "staff-a", employeeAgencyId: "agency-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesBootstrap.initiate({ ...baseArgs, tab: "pending", status: "pending", mode: "ddd", employeeId: "staff-a", employeeAgencyId: "agency-a", clientId: "client-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate({ ...baseArgs, tab: "history", status: "approved", employeeId: "staff-a", employeeAgencyId: "agency-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate({ ...baseArgs, tab: "list", status: "approved", mode: "ddd", employeeId: "staff-a", employeeAgencyId: "agency-a", clientId: "client-a" } as never)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getOverviewBootstrap.initiate({ ...baseArgs, tab: "overview" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.searchBillingOptions.initiate({ actorUid: "super-admin-a", environment: "staging", scope: { kind: "network" }, kind: "client", q: "cli" })).unwrap(),
    ]);

    expect(axiosAdapter.mock.calls.map(([request]) => [request.url, request.params])).toEqual([
      ["/superAdminOperations/billing/claims/bootstrap", { startDate: "2026-07-01", endDate: "2026-07-31", tab: "saved", sort: "createdAt:desc", limit: 25 }],
      ["/superAdminOperations/billing/claims", { startDate: "2026-07-01", endDate: "2026-07-31", tab: "saved", sort: "createdAt:desc", limit: 25 }],
      ["/superAdminOperations/billing/payroll/bootstrap", { startDate: "2026-07-01", endDate: "2026-07-31", tab: "saved", status: "paid", limit: 25 }],
      ["/superAdminOperations/billing/payroll", { startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", tab: "due", employeeId: "staff-a", employeeAgencyId: "agency-a", limit: 25 }],
      ["/superAdminOperations/billing/expenses/bootstrap", { startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", tab: "pending", status: "pending", employeeId: "staff-a", employeeAgencyId: "agency-a", limit: 25 }],
      ["/superAdminOperations/billing/expenses", { startDate: "2026-07-01", endDate: "2026-07-31", tab: "history", status: "approved", employeeId: "staff-a", employeeAgencyId: "agency-a", limit: 25 }],
      ["/superAdminOperations/billing/timesheets", { startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", tab: "list", status: "approved", employeeId: "staff-a", employeeAgencyId: "agency-a", limit: 25 }],
      ["/superAdminOperations/billing/overview/bootstrap", { startDate: "2026-07-01", endDate: "2026-07-31", tab: "overview" }],
      ["/superAdminOperations/billing/options", { kind: "client", q: "cli" }],
    ]);
  });

  it("accepts every declared runtime row variant and preserves validated optional fields", async () => {
    const store = createStore();
    const fullClaim = {
      ...savedClaim,
      claimNumber: "CLM-1",
      status: "pending",
      clientId: "client-a",
      clientName: "Client A",
      serviceCode: "SVC",
      serviceDate: "2026-07-15",
      shiftCount: 1,
      rideCount: 0,
      createdAt: { seconds: 1, nanoseconds: 0 },
      rejectionReason: null,
    };
    const fullInvoice = {
      id: "invoice-1",
      kind: "invoice",
      agencyId: "agency-a",
      agencyName: "Agency A",
      amount: 75,
      invoiceNumber: "INV-1",
      status: "unpaid",
      emailStatus: "sent",
      clientId: "client-a",
      clientName: "Client A",
      payerName: "Payer",
      payerEmail: "payer@example.test",
      serviceCode: "SVC",
      serviceDate: "2026-07-15",
      shiftCount: 1,
      rideCount: 1,
      emailedTo: "payer@example.test",
      emailedAt: "2026-07-16T00:00:00.000Z",
      createdAt: "2026-07-15T00:00:00.000Z",
    };
    const fullShift = {
      ...readyClaim,
      coverage: "insurance",
      splitMode: null,
      splitValue: null,
      claimId: null,
      outOfPocketInvoiceId: null,
      clientId: "client-a",
      clientName: "Client A",
      clientAvatarUrl: null,
      staffId: "staff-a",
      staffName: "Staff A",
      sortDate: "2026-07-15",
      weekRange: "2026-07-13 - 2026-07-19",
      paNumber: "PA-1",
      shiftDate: "2026-07-15",
      clockedInAt: "2026-07-15T08:00:00.000Z",
      clockedOutAt: "2026-07-15T10:00:00.000Z",
      startTime: "08:00 AM",
      endTime: "10:00 AM",
      clientRate: "25",
      clientPayType: "hourly",
    };
    const fullRide = {
      ...readyClaim,
      id: "ride:ride-1",
      sourceType: "ride",
      sourceId: "ride-1",
      coverage: "out_of_pocket",
      splitMode: null,
      splitValue: null,
      claimId: null,
      outOfPocketInvoiceId: null,
      completedAt: "2026-07-15T10:00:00.000Z",
      scheduledStartTime: "2026-07-15T09:00:00.000Z",
      actualDistance: 12,
      isManual: true,
      clientAgreedRate: 1.5,
    };
    const fullPayroll = {
      ...payrollRow,
      invoiceNumber: "PAY-1",
      status: "pending",
      employeeId: "staff-a",
      employeeName: "Staff A",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-15",
      shiftCount: 2,
      createdAt: "2026-07-16T00:00:00.000Z",
      paidAt: null,
    };
    const duePayroll = {
      id: "shift:shift-1",
      sourceType: "shift",
      sourceId: "shift-1",
      agencyId: "agency-a",
      agencyName: "Agency A",
      employeeId: "staff-a",
      staffKey: "agency-a:staff-a",
      mode: "ddd",
      grossAmount: 50,
      totalHours: 2,
      totalsExact: false,
    };
    const fullTimesheet = {
      ...timesheetRow,
      staffUid: "staff-a",
      staffName: "Staff A",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-15",
      payrollInvoiceId: null,
      createdAt: "2026-07-16T00:00:00.000Z",
      payPreview: { billingType: "hourly", billingRate: 25, totalHours: 2, grossAmount: 50 },
    };
    const fullExpense = {
      ...expenseRow,
      employeeId: "staff-a",
      employeeUid: "staff-a",
      employeeName: "Staff A",
      category: "travel",
      date: "2026-07-15",
      submittedAt: "2026-07-15T00:00:00.000Z",
      reviewedAt: null,
      payrollInvoiceId: null,
    };
    const page = (rows: unknown[], total: number | null) => ({
      scope: { kind: "global", agencyCount: 1 },
      page: { rows, total, nextCursor: null, hasMore: false },
    });
    const responses = [
      { success: true, data: page([fullClaim, fullInvoice], 2) },
      { success: true, data: page([fullShift, fullRide], null) },
      { success: true, data: page([fullPayroll], 1), meta: timingMeta },
      { success: true, data: page([duePayroll], null), meta: timingMeta },
      { success: true, data: page([fullTimesheet], null), meta: timingMeta },
      { success: true, data: { ...page([fullExpense], 1), meta: { branchCount: 1 } }, meta: timingMeta },
    ];
    axiosAdapter.mockImplementation((config: RequestConfig) => Promise.resolve({
      data: responses.shift(), status: 200, statusText: "OK", headers: {}, config,
    }));

    const results = await Promise.all([
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(claimsSavedArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...queryContext, tab: "ready" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate(payrollSavedArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate({ ...queryContext, tab: "due" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate(timesheetsArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate(expensesPendingArgs)).unwrap(),
    ]);

    expect(results.map((result) => result.page.rows)).toEqual([
      [fullClaim, fullInvoice],
      [fullShift, fullRide],
      [fullPayroll],
      [duePayroll],
      [fullTimesheet],
      [fullExpense],
    ]);
  });

  it("rejects malformed public scopes, cursor pages, and cross-agency rows", async () => {
    const store = createStore();
    respond({
      success: true,
      data: {
        scope: { kind: "network", agencyCount: 1 },
        page: { rows: [{ ...savedClaim, agencyName: undefined }], total: -1, nextCursor: "not/a/cursor", hasMore: false },
      },
    });

    await expect(store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs)).unwrap())
      .rejects.toMatchObject({ status: "PARSING_ERROR" });
  });

  it.each(malformedResponses)("rejects malformed response: $name", async ({ endpoint, response }) => {
    const store = createStore();
    respond(response);

    await expect(dispatchEndpoint(store, endpoint)).rejects.toMatchObject({ status: "PARSING_ERROR" });
  });

  it("deduplicates concurrent requests with identical serialized arguments", async () => {
    const store = createStore();
    let resolveRequest!: () => void;
    axiosAdapter.mockImplementation((config: RequestConfig) => new Promise((resolve) => {
      resolveRequest = () => resolve({ data: claimsPage, status: 200, statusText: "OK", headers: {}, config });
    }));

    const first = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs));
    const second = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs));
    resolveRequest();
    await Promise.all([first.unwrap(), second.unwrap()]);

    expect(axiosAdapter).toHaveBeenCalledOnce();
  });

  it("deduplicates identical outbound requests after removing runtime-injected unsupported keys", async () => {
    const store = createStore();
    let resolveRequest!: () => void;
    axiosAdapter.mockImplementation((config: RequestConfig) => new Promise((resolve) => {
      resolveRequest = () => resolve({ data: claimsPage, status: 200, statusText: "OK", headers: {}, config });
    }));

    const first = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(claimsSavedArgs));
    const second = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({
      ...claimsSavedArgs,
      mode: "ddd",
      employeeId: "staff-a",
      employeeAgencyId: "agency-a",
      unsupported: "ignored",
    } as never));
    await vi.waitFor(() => expect(axiosAdapter).toHaveBeenCalledOnce());
    resolveRequest();
    await Promise.all([first.unwrap(), second.unwrap()]);

    expect(axiosAdapter).toHaveBeenCalledOnce();
    expect(Object.keys(store.getState()[networkBillingApi.reducerPath].queries)).toHaveLength(1);
  });

  it("isolates actor, environment, filter, and cursor cache entries", async () => {
    const store = createStore();
    const inputs = [
      baseArgs,
      { ...baseArgs, actorUid: "super-admin-b" },
      { ...baseArgs, environment: "production" },
      { ...baseArgs, scope: { kind: "agency" as const, agencyId: "agency-a" } },
      { ...baseArgs, status: "paid" as const },
      { ...baseArgs, cursor: "cursorB" },
    ];

    await Promise.all(inputs.map((input) =>
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(input)).unwrap(),
    ));

    expect(axiosAdapter).toHaveBeenCalledTimes(inputs.length);
    expect(Object.keys(store.getState()[networkBillingApi.reducerPath].queries)).toHaveLength(inputs.length);
  });

  it("isolates every supported result-shaping argument across all endpoints", async () => {
    const store = createStore();
    const responseByPath: Record<string, unknown> = {
      "/superAdminOperations/billing/claims": claimsPage,
      "/superAdminOperations/billing/payroll": payrollPageResponse,
      "/superAdminOperations/billing/expenses": expensesPageResponse,
      "/superAdminOperations/billing/timesheets": {
        success: true,
        data: { scope: { kind: "global", agencyCount: 1 }, page: { ...emptyPage, rows: [timesheetRow], total: null } },
        meta: timingMeta,
      },
      "/superAdminOperations/billing/overview/bootstrap": overviewResponse,
      "/superAdminOperations/billing/options": optionsResponse,
    };
    axiosAdapter.mockImplementation((config: RequestConfig) => Promise.resolve({
      data: responseByPath[config.url ?? ""],
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));

    const requests: Array<Promise<unknown>> = [
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(claimsSavedArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, startDate: "2026-07-02" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, endDate: "2026-07-30" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, limit: 50 })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, cursor: "cursorA" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, status: "paid" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, sort: "createdAt:asc" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...claimsSavedArgs, clientId: "client-a", clientAgencyId: "agency-a" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate({ ...queryContext, tab: "ready", mode: "ddd" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate(payrollSavedArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate({ ...payrollSavedArgs, status: "paid" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate({ ...payrollSavedArgs, mode: "ddd" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate({ ...payrollSavedArgs, employeeId: "staff-a", employeeAgencyId: "agency-a" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getPayrollPage.initiate({ ...queryContext, tab: "due", cursor: "cursorB" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate(expensesPendingArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate({ ...expensesPendingArgs, mode: "hha" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate({ ...expensesPendingArgs, employeeId: "staff-a", employeeAgencyId: "agency-a" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getExpensesPage.initiate({ ...queryContext, tab: "history", status: "approved" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate(timesheetsArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate({ ...timesheetsArgs, status: "approved" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate({ ...timesheetsArgs, mode: "ddd" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getTimesheetsPage.initiate({ ...timesheetsArgs, employeeId: "staff-a", employeeAgencyId: "agency-a" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getOverviewBootstrap.initiate(overviewArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getOverviewBootstrap.initiate({ ...overviewArgs, mode: "ddd" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.getOverviewBootstrap.initiate({ ...overviewArgs, startDate: "2026-07-02", endDate: "2026-07-30" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.searchBillingOptions.initiate(optionsArgs)).unwrap(),
      store.dispatch(networkBillingApi.endpoints.searchBillingOptions.initiate({ ...optionsArgs, kind: "staff" })).unwrap(),
      store.dispatch(networkBillingApi.endpoints.searchBillingOptions.initiate({ ...optionsArgs, q: "client" })).unwrap(),
    ];

    await Promise.all(requests);
    expect(axiosAdapter).toHaveBeenCalledTimes(requests.length);
    expect(Object.keys(store.getState()[networkBillingApi.reducerPath].queries)).toHaveLength(requests.length);
  });

  it("passes RTK's cancellation signal to Axios without creating another controller", async () => {
    const store = createStore();
    let request: RequestConfig | undefined;
    axiosAdapter.mockImplementation((config: RequestConfig) => new Promise((_, reject) => {
      request = config;
      config.signal?.addEventListener?.("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    const pending = store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs));
    await vi.waitFor(() => expect(request).toBeDefined());
    pending.abort?.();
    await expect(pending.unwrap()).rejects.toMatchObject({ name: "AbortError" });
    expect(request?.signal?.aborted).toBe(true);
  });

  it("retains unused cache entries for sixty seconds", () => {
    expect(NETWORK_BILLING_KEEP_UNUSED_DATA_FOR).toBe(60);
  });

  it("resets all network billing cache state", async () => {
    const store = createStore();
    await store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(baseArgs)).unwrap();
    store.dispatch(networkBillingApi.util.resetApiState());
    expect(Object.keys(store.getState()[networkBillingApi.reducerPath].queries)).toHaveLength(0);
  });

  it("resets the API reducer and subscriber before downstream logout observers", async () => {
    const events: string[] = [];
    const downstreamObserver: Middleware = ({ getState }) => (next) => (action) => {
      if (logoutUser.fulfilled.match(action)) {
        const state = getState() as { networkBillingApi: { queries: Record<string, unknown> } };
        events.push(`logout-observer:${Object.keys(state.networkBillingApi.queries).length}`);
      }
      return next(action);
    };
    const downstreamReducer = (state = 0, action: unknown) => {
      if (logoutUser.fulfilled.match(action)) events.push("logout-reducer");
      return state;
    };
    const store = configureStore({
      reducer: {
        [networkBillingApi.reducerPath]: networkBillingApi.reducer,
        downstream: downstreamReducer,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false })
        .concat(networkBillingLogoutResetMiddleware, networkBillingApi.middleware, downstreamObserver),
    });
    await store.dispatch(networkBillingApi.endpoints.getClaimsPage.initiate(claimsSavedArgs)).unwrap();
    let previousQueryCount = 1;
    store.subscribe(() => {
      const queryCount = Object.keys(store.getState().networkBillingApi.queries).length;
      if (previousQueryCount > 0 && queryCount === 0) events.push("api-reset-subscriber");
      previousQueryCount = queryCount;
    });

    store.dispatch(logoutUser.fulfilled(undefined, "logout-request", undefined));

    expect(events).toEqual(["api-reset-subscriber", "logout-observer:0", "logout-reducer"]);
  });
});
