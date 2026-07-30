import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import type {
  OperationalActor,
  OperationalAgencyDataAdapter,
  OperationalCapabilities,
} from "@/lib/operational-agency/types";

const expenseApi = vi.hoisted(() => ({
  dashboard: vi.fn(),
  list: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  remove: vi.fn(),
}));
const timesheetApi = vi.hoisted(() => ({
  list: vi.fn(),
  review: vi.fn(),
  createPayroll: vi.fn(),
}));
const ui = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      uid: "actor-1",
      agencyId: "auth-owned-agency",
      agency: {
        id: "auth-owned-agency",
        name: "Auth Owned Agency",
        supportedClientTypes: ["hha"],
      },
      profile: { accessList: ["Billing Management"] },
    },
  }),
}));
vi.mock("react-redux", () => ({
  useSelector: () => "hha",
}));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({
  useEffectiveAgencyMode: () => "hha",
  resolveEffectiveAgencyMode: () => "hha",
}));
vi.mock("@/hooks/useStaffLabels", () => ({
  useStaffLabels: () => ({ mode: "hha", labels: { noun: "PCA" } }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: ui.toast }) }));
vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/api/billing-expenses", () => ({
  useGetExpensesDashboardQuery: expenseApi.dashboard,
  useGetAgencyExpensesQuery: expenseApi.list,
  useApproveExpenseMutation: () => [expenseApi.approve, { isLoading: false }],
  useRejectExpenseMutation: () => [expenseApi.reject, { isLoading: false }],
  useDeleteExpenseMutation: () => [expenseApi.remove, { isLoading: false }],
}));
vi.mock("@/lib/api/staff-timesheets", () => ({
  listStaffTimesheets: timesheetApi.list,
  reviewStaffTimesheet: timesheetApi.review,
  createStaffPayrollInvoice: timesheetApi.createPayroll,
  getStaffTimesheetErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Timesheet request failed",
}));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesDashboardHeader", () => ({
  default: () => <h1>DSP expenses</h1>,
}));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesOverviewCards", () => ({
  default: () => <output aria-label="Expense overview">overview</output>,
}));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesByStatusChart", () => ({
  default: () => <output aria-label="Expense status chart">chart</output>,
}));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesWorkspaceTabs", () => ({
  default: ({ onTabChange }: { onTabChange: (tab: "pending" | "all") => void }) => (
    <button type="button" onClick={() => onTabChange("all")}>All submissions</button>
  ),
}));
vi.mock("@/pages/agency/billing/expenses/components/PendingExpensesTable", () => ({
  default: ({ expenses, onApprove, onDecline, onDelete }: {
    expenses: typeof expenseRows;
    onApprove: (expense: (typeof expenseRows)[number]) => void;
    onDecline: (expense: (typeof expenseRows)[number]) => void;
    onDelete: (expense: (typeof expenseRows)[number]) => void;
  }) => (
    <div>
      <output aria-label="Pending expenses">{expenses.map((row) => row.employeeName).join(",")}</output>
      {expenses[0] ? (
        <>
          <button type="button" onClick={() => onApprove(expenses[0])}>Approve expense</button>
          <button type="button" onClick={() => onDecline(expenses[0])}>Decline expense</button>
          <button type="button" onClick={() => onDelete(expenses[0])}>Delete expense</button>
        </>
      ) : null}
    </div>
  ),
}));
vi.mock("@/pages/agency/billing/expenses/components/ExpensesHistoryTable", () => ({
  default: ({ expenses }: { expenses: typeof expenseRows }) => (
    <output aria-label="Expense history">{expenses.map((row) => row.employeeName).join(",")}</output>
  ),
}));
vi.mock("@/pages/agency/billing/expenses/components/RejectExpenseModal", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: (notes: string) => void }) => open ? (
    <button type="button" onClick={() => onConfirm("Receipt is unreadable")}>Confirm decline</button>
  ) : null,
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({ isOpen, title, onConfirm }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  }) => isOpen ? <button type="button" onClick={onConfirm}>{title}</button> : null,
}));

import ExpensesDashboardPage from "@/pages/agency/billing/expenses";
import StaffTimesheetsApprovalPage from "@/pages/agency/billing/staff-timesheets";
import { router } from "@/routes";

const atlas = {
  id: "atlas",
  name: "Atlas Care",
  status: "active",
  supportedClientTypes: ["ddd"] as const,
  timezone: "America/New_York",
};
const beacon = { ...atlas, id: "beacon", name: "Beacon Supports" };
const capabilities: OperationalCapabilities = {
  canManageShifts: false,
  canManageBilling: true,
  shiftMaintenance: false,
  canAccessClientDirectory: false,
  canAccessStaffDirectory: false,
};

const expenseRows = [{
  id: "expense-1",
  employeeId: "employee-1",
  employeeUid: "staff-1",
  employeeName: "Alex Atlas",
  amount: 45,
  category: "Travel",
  message: "Bus fare",
  receiptUrl: null,
  status: "pending" as const,
  date: "2026-07-28",
  submittedAt: "2026-07-28T10:00:00.000Z",
  reviewedAt: null,
  reviewerNotes: null,
  payrollInvoiceId: null,
}];

const pendingTimesheet = {
  id: "timesheet-pending",
  agencyId: "atlas",
  staffUid: "staff-1",
  staffName: "Alex Atlas",
  role: "DSP",
  mode: "ddd" as const,
  periodStart: "2026-07-14",
  periodEnd: "2026-07-27",
  entries: [{ week: 1, day: "Monday", date: "2026-07-20", checkIn: "09:00", checkOut: "17:00", hours: 8 }],
  totalHours: 8,
  signature: null,
  signatureInfo: "",
  status: "pending" as const,
  reviewedAt: null,
  reviewedBy: null,
  reviewerNotes: null,
  payrollInvoiceId: null,
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z",
};
const approvedTimesheet = {
  ...pendingTimesheet,
  id: "timesheet-approved",
  staffUid: "staff-2",
  staffName: "Avery Approved",
  status: "approved" as const,
};

function dataAdapter(): OperationalAgencyDataAdapter {
  return {
    searchClients: vi.fn(),
    searchStaff: vi.fn(),
    listServices: vi.fn(),
    getClientSchedulingContext: vi.fn(),
    getStaffSchedulingContext: vi.fn(),
    createStaffActivity: vi.fn(),
    createGoalDocument: vi.fn(),
  } as OperationalAgencyDataAdapter;
}

function Scope({
  actor,
  agency = atlas,
  children,
}: {
  actor: OperationalActor;
  agency?: typeof atlas;
  children: React.ReactNode;
}) {
  return (
    <MemoryRouter initialEntries={[`/billing?agencyId=${agency.id}&clientType=ddd`]}>
      <OperationalAgencyProvider
        actor={actor}
        agencyId={agency.id}
        agency={agency}
        mode="ddd"
        capabilities={capabilities}
        data={dataAdapter()}
      >
        {children}
      </OperationalAgencyProvider>
    </MemoryRouter>
  );
}

function mutationRequest<T>(value: T) {
  return { unwrap: vi.fn().mockResolvedValue(value), abort: vi.fn() };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("super-admin expense and submitted-timesheet parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    expenseApi.dashboard.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    expenseApi.list.mockImplementation((input: { status: string }) => ({
      data: { expenses: expenseRows, total: 1, hasMore: false },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
      input,
    }));
    expenseApi.approve.mockImplementation(() => mutationRequest({ success: true }));
    expenseApi.reject.mockImplementation(() => mutationRequest({ success: true }));
    expenseApi.remove.mockImplementation(() => mutationRequest({ success: true }));
    timesheetApi.list.mockResolvedValue({ timesheets: [pendingTimesheet, approvedTimesheet], total: 2 });
    timesheetApi.review.mockResolvedValue(undefined);
    timesheetApi.createPayroll.mockResolvedValue({ id: "payroll-1" });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("produces equal agency-scoped expense dashboard and history inputs for agency and super-admin actors", async () => {
    const observed: Array<{ dashboard: unknown; pending: unknown; history: unknown }> = [];
    for (const actor of ["agency", "super_admin"] as const) {
      const view = render(<Scope actor={actor}><ExpensesDashboardPage /></Scope>);
      await userEvent.click(screen.getByRole("button", { name: "All submissions" }));
      const pending = expenseApi.list.mock.calls.find(([, options]) => !options.skip && options !== undefined);
      const history = expenseApi.list.mock.calls.find(([input, options]) => input.status === "all" && !options.skip);
      observed.push({ dashboard: expenseApi.dashboard.mock.calls[0][0], pending: pending?.[0], history: history?.[0] });
      view.unmount();
      expenseApi.dashboard.mockClear();
      expenseApi.list.mockClear();
    }

    expect(observed[0]).toEqual(observed[1]);
    expect(observed[0]).toEqual(expect.objectContaining({
      dashboard: expect.objectContaining({ agencyId: "atlas", mode: "ddd" }),
      pending: expect.objectContaining({ agencyId: "atlas", mode: "ddd", status: "pending" }),
      history: expect.objectContaining({ agencyId: "atlas", mode: "ddd", status: "all" }),
    }));
  });

  it("scopes approve, reject, and delete expense workflows to the operational agency", async () => {
    const user = userEvent.setup();
    render(<Scope actor="super_admin"><ExpensesDashboardPage /></Scope>);

    await user.click(screen.getByRole("button", { name: "Approve expense" }));
    await user.click(screen.getByRole("button", { name: /Approve expense for Alex Atlas/ }));
    await waitFor(() => expect(expenseApi.approve).toHaveBeenCalledWith({ agencyId: "atlas", expenseId: "expense-1" }));

    await user.click(screen.getByRole("button", { name: "Decline expense" }));
    await user.click(await screen.findByRole("button", { name: "Confirm decline" }));
    await waitFor(() => expect(expenseApi.reject).toHaveBeenCalledWith({
      agencyId: "atlas",
      expenseId: "expense-1",
      reviewerNotes: "Receipt is unreadable",
    }));

    await user.click(screen.getByRole("button", { name: "Delete expense" }));
    await user.click(screen.getByRole("button", { name: /Delete expense for Alex Atlas/ }));
    await waitFor(() => expect(expenseApi.remove).toHaveBeenCalledWith({ agencyId: "atlas", expenseId: "expense-1" }));
  });

  it("lists, details, reviews, and creates payroll from submitted timesheets in one operational agency", async () => {
    const user = userEvent.setup();
    render(<Scope actor="super_admin"><StaffTimesheetsApprovalPage /></Scope>);
    await waitFor(() => expect(timesheetApi.list).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      query: { scope: "agency", mode: "ddd" },
      signal: expect.any(AbortSignal),
    }));

    await user.click((await screen.findAllByRole("button", { name: "Timesheet actions" }))[0]);
    await user.click(await screen.findByRole("menuitem", { name: "View" }));
    const detail = await screen.findByRole("dialog", { name: "Alex Atlas" });
    expect(detail).toBeVisible();
    expect(detail).toHaveAccessibleDescription(/Review submitted hours/i);
    await user.click(within(detail).getAllByRole("button", { name: "Close" })[0]);

    await user.click(screen.getAllByRole("button", { name: "Timesheet actions" })[0]);
    await user.click(await screen.findByRole("menuitem", { name: "Approve" }));
    await waitFor(() => expect(timesheetApi.review).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      timesheetId: "timesheet-pending",
      status: "approved",
      signal: expect.any(AbortSignal),
    }));

    await user.click(screen.getAllByRole("button", { name: "Timesheet actions" })[0]);
    await user.click(await screen.findByRole("menuitem", { name: "Reject" }));
    const rejectDialog = await screen.findByRole("dialog", { name: "Reject timesheet" });
    expect(rejectDialog).toHaveAccessibleDescription(/Let Alex Atlas know why/i);
    await user.type(within(rejectDialog).getByRole("textbox", { name: "Reason for rejection" }), "Hours need correction");
    await user.click(within(rejectDialog).getByRole("button", { name: "Reject timesheet" }));
    await waitFor(() => expect(timesheetApi.review).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      timesheetId: "timesheet-pending",
      status: "rejected",
      reviewerNotes: "Hours need correction",
      signal: expect.any(AbortSignal),
    }));

    await user.click(screen.getAllByRole("button", { name: "Timesheet actions" })[1]);
    await user.click(await screen.findByRole("menuitem", { name: "View" }));
    await user.click(await screen.findByRole("button", { name: "Create payroll" }));
    await waitFor(() => expect(timesheetApi.createPayroll).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      payload: {
        staffUid: "staff-2",
        periodStart: "2026-07-14",
        periodEnd: "2026-07-27",
        staffTimesheetIds: ["timesheet-approved"],
      },
      signal: expect.any(AbortSignal),
    }));
  }, 10_000);

  it("aborts and clears stale timesheet reads, filters, details, and toasts when agency changes", async () => {
    const atlasLoad = deferred<{ timesheets: typeof pendingTimesheet[]; total: number }>();
    let atlasSignal: AbortSignal | undefined;
    timesheetApi.list.mockImplementation(({ context, signal }: { context: { agencyId: string }; signal?: AbortSignal }) => {
      if (context.agencyId === "atlas") {
        atlasSignal = signal;
        return atlasLoad.promise;
      }
      return Promise.resolve({ timesheets: [{ ...approvedTimesheet, agencyId: "beacon", staffName: "Bea Beacon" }], total: 1 });
    });
    const view = render(<Scope actor="super_admin"><StaffTimesheetsApprovalPage /></Scope>);
    await waitFor(() => expect(timesheetApi.list).toHaveBeenCalledTimes(1));

    view.rerender(<Scope actor="super_admin" agency={beacon}><StaffTimesheetsApprovalPage /></Scope>);
    expect(atlasSignal?.aborted).toBe(true);
    expect(await screen.findByText("Bea Beacon")).toBeVisible();
    ui.toast.mockClear();
    await act(async () => atlasLoad.resolve({ timesheets: [pendingTimesheet], total: 1 }));
    expect(screen.queryByText("Alex Atlas")).not.toBeInTheDocument();
    expect(ui.toast).not.toHaveBeenCalled();
  });

  it("aborts a pending expense mutation and suppresses stale completion on agency change", async () => {
    const pending = deferred<{ success: boolean }>();
    const abort = vi.fn();
    expenseApi.approve.mockReturnValue({ unwrap: () => pending.promise, abort });
    const user = userEvent.setup();
    const view = render(<Scope actor="super_admin"><ExpensesDashboardPage /></Scope>);
    await user.click(screen.getByRole("button", { name: "Approve expense" }));
    await user.click(screen.getByRole("button", { name: /Approve expense for Alex Atlas/ }));
    await waitFor(() => expect(expenseApi.approve).toHaveBeenCalledTimes(1));

    view.rerender(<Scope actor="super_admin" agency={beacon}><ExpensesDashboardPage /></Scope>);
    expect(abort).toHaveBeenCalledTimes(1);
    ui.toast.mockClear();
    await act(async () => pending.resolve({ success: true }));
    expect(ui.toast).not.toHaveBeenCalled();
  });

  it("requires provider context before either shared page can issue billing operations", () => {
    expect(() => render(<ExpensesDashboardPage />)).toThrow(/OperationalAgencyProvider/);
    expect(() => render(<StaffTimesheetsApprovalPage />)).toThrow(/OperationalAgencyProvider/);
    expect(expenseApi.dashboard).not.toHaveBeenCalled();
    expect(expenseApi.list).not.toHaveBeenCalled();
    expect(timesheetApi.list).not.toHaveBeenCalled();
  });

  it("mounts only the billing-side children and leaves employee self-service outside the super-admin tree", () => {
    const findRoute = (routes: typeof router.routes, path: string): (typeof router.routes)[number] | undefined => {
      for (const route of routes) {
        if (route.path === path) return route;
        const nested = route.children ? findRoute(route.children, path) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    const billingRoute = findRoute(router.routes, "/super-admin/billing");
    const childPaths = billingRoute?.children?.map((child) => child.path) ?? [];
    expect(childPaths).toEqual(expect.arrayContaining(["expenses", "staff-timesheets"]));
    expect(childPaths).not.toContain("staff-timesheet");
    expect(findRoute(router.routes, "/super-admin/staff-timesheet")).toBeUndefined();
    expect(findRoute(router.routes, "/agency/staff-timesheet")).toBeDefined();
  });
});
