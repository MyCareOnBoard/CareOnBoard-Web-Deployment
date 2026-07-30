import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import type {
  OperationalActor,
  OperationalAgencyDataAdapter,
  OperationalCapabilities,
  OperationalDirectoryRoutes,
} from "@/lib/operational-agency/types";

const payrollApi = vi.hoisted(() => ({
  getPayrollDashboard: vi.fn(),
  getStaffToPay: vi.fn(),
  listPayrollInvoices: vi.fn(),
  getPayrollInvoicePreview: vi.fn(),
  createPayrollInvoice: vi.fn(),
  getPayrollInvoiceById: vi.fn(),
  markPayrollInvoicePaid: vi.fn(),
  cancelPayrollInvoice: vi.fn(),
}));
const timesheetApi = vi.hoisted(() => ({
  listStaffTimesheets: vi.fn(),
  createStaffPayrollInvoice: vi.fn(),
}));
const agencyApi = vi.hoisted(() => ({ getAgencyById: vi.fn() }));
const ui = vi.hoisted(() => ({ toast: vi.fn() }));
const printApi = vi.hoisted(() => ({ downloadPayrollInvoicePdf: vi.fn() }));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      uid: "super-actor",
      agencyId: "actor-agency",
      fullName: "Actor Agency",
      profile: { accessList: ["Billing Management"] },
    },
  }),
}));
vi.mock("react-redux", () => ({ useSelector: () => "ddd" }));
vi.mock("react-loader-spinner", () => ({ Oval: () => <span>Loading</span> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: ui.toast }) }));
vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/api/agencies", () => agencyApi);
vi.mock("@/lib/api/staff-timesheets", () => ({
  ...timesheetApi,
  getStaffTimesheetErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Timesheet request failed",
}));
vi.mock("@/lib/api/payroll", () => ({
  ...payrollApi,
  getCreatePayrollInvoiceErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Create failed",
  getPayrollBlockedShifts: () => [],
  getPayrollInvoiceMutationErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Mutation failed",
  getPayrollInvoicePreviewErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Preview failed",
  getPayrollListErrorMessage: () => "List failed",
}));
vi.mock("@/pages/agency/billing/payroll/utils/payrollInvoicePrintUtils", () => printApi);
vi.mock("@/pages/agency/billing/payroll/components/PayrollOverviewCards", () => ({
  default: ({ stats, loading }: { stats: Array<{ label: string; value: string }>; loading: boolean }) => (
    <output aria-label="Payroll overview">
      {loading ? "loading" : stats.map((stat) => `${stat.label}:${stat.value}`).join("|")}
    </output>
  ),
}));
vi.mock("@/pages/agency/billing/payroll/components/PayrollSummaryChart", () => ({
  default: () => <div>Payroll summary chart</div>,
}));
vi.mock("@/pages/agency/billing/payroll/components/TopOvertimeAlerts", () => ({
  default: ({ alerts }: { alerts: Array<{ staffName: string }> }) => (
    <output aria-label="Overtime alerts">{alerts.map((alert) => alert.staffName).join(",")}</output>
  ),
}));
vi.mock("@/pages/agency/billing/payroll/components/BillingDashboardHeader", () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));
vi.mock("@/pages/agency/billing/components/BillingDashboardHeader", () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));
vi.mock("@/pages/agency/billing/payroll/components/DuePayrollTable", () => ({
  default: ({ entries, onCreateInvoiceClick }: {
    entries: Array<{ id: string; staffName: string; paRate: string; grossAmount: number }>;
    onCreateInvoiceClick: (entry: never) => void;
  }) => (
    <div>
      <output aria-label="Due payroll names">{entries.map((entry) => entry.staffName).join(",")}</output>
      <output aria-label="Due payroll financials">
        {entries.map((entry) => `${entry.staffName}|${entry.paRate}|$${entry.grossAmount.toFixed(2)}`).join(",")}
      </output>
      {entries.map((entry) => (
        <button key={entry.id} type="button" onClick={() => onCreateInvoiceClick(entry as never)}>
          Create invoice for {entry.staffName}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({ isOpen, title, onConfirm }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  }) => isOpen ? (
    <div role="dialog" aria-label={title}>
      <button type="button" onClick={onConfirm}>Confirm {title}</button>
    </div>
  ) : null,
}));

import PayrollDashboardPage from "@/pages/agency/billing/payroll";
import CreatePayrollInvoiceModal from "@/pages/agency/billing/payroll/components/CreatePayrollInvoiceModal";
import DuePayrollRow from "@/pages/agency/billing/payroll/components/DuePayrollRow";
import { invalidatePayrollData } from "@/pages/agency/billing/shared/billingInvalidation";
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
  scopeCapabilities = capabilities,
  directoryRoutes,
}: {
  actor: OperationalActor;
  agency?: typeof atlas;
  children: React.ReactNode;
  scopeCapabilities?: OperationalCapabilities;
  directoryRoutes?: OperationalDirectoryRoutes;
}) {
  return (
    <MemoryRouter initialEntries={[`/billing?agencyId=${agency.id}&clientType=ddd`]}>
      <OperationalAgencyProvider
        actor={actor}
        agencyId={agency.id}
        agency={agency}
        mode="ddd"
        capabilities={scopeCapabilities}
        directoryRoutes={directoryRoutes}
        data={dataAdapter()}
      >
        {children}
      </OperationalAgencyProvider>
    </MemoryRouter>
  );
}

function renderPayroll(actor: OperationalActor, agency = atlas) {
  return render(<Scope actor={actor} agency={agency}><PayrollDashboardPage /></Scope>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const dashboard = {
  overview: {
    totalDue: { amount: 340, count: 2 },
    hoursPendingApproval: { hours: 4 },
    overtime: { hours: 2 },
    missingTimesheet: { count: 1 },
    upcomingPayout: { amount: 200, date: "2026-08-03" },
  },
  payrollByStatus: { total: 1, segments: [{ status: "pending" as const, count: 1 }] },
  overtimeAlerts: [{ employeeId: "employee-1", staffName: "Dana DSP", overtimeHours: "2" }],
};

const dueEntry = {
  id: "employee-1",
  employeeId: "employee-1",
  staffName: "Dana DSP",
  staffId: "DSP-001",
  hoursWorked: "8 hrs",
  dateRangeStart: "2026-07-27",
  dateRangeEnd: "2026-08-02",
  paymentDetails: "Direct deposit",
  paRate: "$25/hr",
  grossAmount: 200,
};

const approvedTimesheet = {
  id: "timesheet-1",
  agencyId: "atlas",
  staffUid: "staff-user-1",
  staffName: "Avery Admin",
  role: "Account manager",
  mode: "ddd" as const,
  periodStart: "2026-07-14",
  periodEnd: "2026-07-27",
  entries: [],
  totalHours: 8,
  signature: null,
  signatureInfo: "",
  status: "approved" as const,
  reviewedAt: null,
  reviewedBy: null,
  reviewerNotes: null,
  payrollInvoiceId: null,
  createdAt: "2026-07-28T12:00:00.000Z",
  updatedAt: "2026-07-28T12:00:00.000Z",
  payPreview: {
    billingType: "hourly" as const,
    billingRate: 25,
    totalHours: 8,
    grossAmount: 200,
  },
};

const invoicePrefill = {
  employeeName: "Dana DSP",
  agencyName: "Atlas Care",
  periodStart: "2026-07-27",
  periodEnd: "2026-08-02",
  dateRangeLabel: "Jul 27 - Aug 2, 2026",
  earnings: [{ description: "Regular hours", hours: "8", rate: "$25.00", amount: "$200.00" }],
  totals: { totalHours: "8", grossPay: "$200.00", taxWithheld: null, netPay: "$200.00" },
  payment: { summary: "Direct deposit" },
  support: { email: "billing@atlas.test", phone: "555-0100", addressLines: ["1 Atlas Way"] },
  grossAmount: 200,
  totalHours: 8,
};

const invoice = {
  id: "payroll-1",
  invoiceNumber: "PAY-001",
  status: "pending" as const,
  grossAmount: 200,
  employeeId: "employee-1",
  employeeName: "Dana DSP",
  periodStart: "2026-07-27",
  periodEnd: "2026-08-02",
  shiftIds: ["shift-1"],
  totalHours: 8,
  overtimeHours: 0,
  invoicePrefill,
  createdAt: "2026-08-02T12:00:00.000Z",
  updatedAt: "2026-08-02T12:00:00.000Z",
  paidAt: null,
};

const staffInvoicePrefill = {
  ...invoicePrefill,
  employeeName: "Avery Admin",
  periodStart: "2026-07-14",
  periodEnd: "2026-07-27",
  dateRangeLabel: "Jul 14 - Jul 27, 2026",
  earnings: [{ description: "Worked hours", hours: "8 hrs", rate: "$25.00/hr", amount: "$200.00" }],
};

const staffInvoice = {
  ...invoice,
  id: "staff-payroll-1",
  invoiceNumber: "PAY-STAFF-001",
  employeeId: "staff-user-1",
  employeeName: "Avery Admin",
  periodStart: "2026-07-14",
  periodEnd: "2026-07-27",
  shiftIds: [],
  staffTimesheetIds: ["timesheet-1"],
  invoicePrefill: staffInvoicePrefill,
};

const invoiceListItem = {
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  status: invoice.status,
  grossAmount: invoice.grossAmount,
  employeeId: invoice.employeeId,
  employeeName: invoice.employeeName,
  periodStart: invoice.periodStart,
  periodEnd: invoice.periodEnd,
  totalHours: invoice.totalHours,
  shiftCount: 1,
  createdAt: invoice.createdAt,
  paidAt: null,
};

const preview = {
  employeeId: "employee-1",
  employeeName: "Dana DSP",
  periodStart: "2026-07-27",
  periodEnd: "2026-08-02",
  dateRangeLabel: "Jul 27 - Aug 2, 2026",
  paymentDetails: "Direct deposit",
  mileageRate: 0.67,
  items: [
    {
      id: "shift-1",
      type: "shift" as const,
      typeLabel: "Shift",
      description: "Regular shift",
      date: "2026-07-29",
      hoursLabel: "8 hrs",
      rateLabel: "$25/hr",
      amount: 200,
      amountLabel: "$200.00",
      quantity: 8,
      rateStatus: "ok" as const,
    },
  ],
  totals: { totalHours: 8, grossAmount: 200, shiftPayTotal: 200, ridePayTotal: 0, expenseTotal: 0 },
};

describe("shared payroll operational parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    payrollApi.getPayrollDashboard.mockResolvedValue(dashboard);
    payrollApi.getStaffToPay.mockResolvedValue({ entries: [dueEntry], total: 1, page: 1, limit: 100 });
    payrollApi.listPayrollInvoices.mockResolvedValue({ invoices: [invoiceListItem], total: 1 });
    payrollApi.getPayrollInvoicePreview.mockResolvedValue(preview);
    payrollApi.createPayrollInvoice.mockResolvedValue(invoice);
    payrollApi.getPayrollInvoiceById.mockImplementation(({ invoiceId }: { invoiceId: string }) =>
      Promise.resolve(invoiceId === staffInvoice.id ? staffInvoice : invoice),
    );
    payrollApi.markPayrollInvoicePaid.mockResolvedValue(undefined);
    payrollApi.cancelPayrollInvoice.mockResolvedValue(undefined);
    timesheetApi.listStaffTimesheets.mockResolvedValue({ timesheets: [approvedTimesheet], total: 1 });
    timesheetApi.createStaffPayrollInvoice.mockResolvedValue({ id: staffInvoice.id });
    agencyApi.getAgencyById.mockResolvedValue({ name: "Atlas Care" });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    vi.spyOn(window, "print").mockImplementation(() => undefined);
  });

  it("uses equal selected-agency dashboard and due-list payloads for agency and super-admin actors", async () => {
    const agencyView = renderPayroll("agency");
    await waitFor(() => expect(screen.getByLabelText("Due payroll names")).toHaveTextContent("Dana DSP"));
    const agencyDashboard = payrollApi.getPayrollDashboard.mock.calls[0][0];
    const agencyDue = payrollApi.getStaffToPay.mock.calls[0][0];
    const agencyTimesheets = timesheetApi.listStaffTimesheets.mock.calls[0][0];
    expect(screen.getByLabelText("Payroll overview")).toHaveTextContent("$340.00");
    expect(screen.getByLabelText("Overtime alerts")).toHaveTextContent("Dana DSP");
    expect(screen.getByLabelText("Due payroll names")).toHaveTextContent("Avery Admin");
    const agencyTimesheetFinancials = screen.getByLabelText("Due payroll financials").textContent;
    agencyView.unmount();

    vi.clearAllMocks();
    payrollApi.getPayrollDashboard.mockResolvedValue(dashboard);
    payrollApi.getStaffToPay.mockResolvedValue({ entries: [dueEntry], total: 1, page: 1, limit: 100 });
    payrollApi.listPayrollInvoices.mockResolvedValue({ invoices: [invoiceListItem], total: 1 });
    timesheetApi.listStaffTimesheets.mockResolvedValue({ timesheets: [approvedTimesheet], total: 1 });

    renderPayroll("super_admin");
    await waitFor(() => expect(screen.getByLabelText("Due payroll names")).toHaveTextContent("Dana DSP"));
    const superDashboard = payrollApi.getPayrollDashboard.mock.calls[0][0];
    const superDue = payrollApi.getStaffToPay.mock.calls[0][0];
    const superTimesheets = timesheetApi.listStaffTimesheets.mock.calls[0][0];

    expect(superDashboard.context).toEqual({ agencyId: "atlas" });
    expect(superDashboard.context).toEqual(agencyDashboard.context);
    expect(superDashboard.query).toEqual(agencyDashboard.query);
    expect(superDue.context).toEqual(agencyDue.context);
    expect(superDue.query).toEqual(agencyDue.query);
    expect(superTimesheets.context).toEqual(agencyTimesheets.context);
    expect(superTimesheets.query).toEqual(agencyTimesheets.query);
    const superTimesheetFinancials = screen.getByLabelText("Due payroll financials").textContent;
    expect(superTimesheetFinancials).toBe(agencyTimesheetFinancials);
    expect(superTimesheetFinancials).toContain("Avery Admin|$25.00/hr|$200.00");
  });

  it("shows authoritative staff-timesheet pay and opens a matching created invoice document", async () => {
    const user = userEvent.setup();
    renderPayroll("super_admin");

    await waitFor(() => expect(screen.getByLabelText("Due payroll financials"))
      .toHaveTextContent("Avery Admin|$25.00/hr|$200.00"));
    await user.click(screen.getByRole("button", { name: "Create invoice for Avery Admin" }));

    await waitFor(() => expect(timesheetApi.createStaffPayrollInvoice).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      payload: {
        staffUid: "staff-user-1",
        periodStart: "2026-07-14",
        periodEnd: "2026-07-27",
        staffTimesheetIds: ["timesheet-1"],
      },
      signal: expect.any(AbortSignal),
    }));
    await waitFor(() => expect(payrollApi.getPayrollInvoiceById).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      invoiceId: staffInvoice.id,
      signal: expect.any(AbortSignal),
    }));
    expect(await screen.findByRole("dialog", { name: "Paystub Invoice" }, { timeout: 5_000 }))
      .toHaveAccessibleDescription(/Avery Admin/i);
    expect(screen.getAllByText("$25.00/hr").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$200.00").length).toBeGreaterThan(0);
  });

  it("uses one grouped server preview when a staff member has multiple eligible timesheets", async () => {
    const groupedPayPreview = {
      billingType: "hourly" as const,
      billingRate: 16.67,
      totalHours: 0.04,
      grossAmount: 0.67,
    };
    timesheetApi.listStaffTimesheets.mockResolvedValue({
      timesheets: [
        { ...approvedTimesheet, payPreview: groupedPayPreview },
        {
          ...approvedTimesheet,
          id: "timesheet-2",
          periodStart: "2026-07-28",
          periodEnd: "2026-08-03",
          payPreview: groupedPayPreview,
        },
      ],
      total: 2,
    });

    renderPayroll("super_admin");

    await waitFor(() => expect(screen.getByLabelText("Due payroll financials"))
      .toHaveTextContent("Avery Admin|$16.67/hr|$0.67"));
  });

  it("fails closed instead of rendering a zero staff-timesheet amount without a server preview", async () => {
    const { payPreview: _missingPreview, ...timesheetWithoutPreview } = approvedTimesheet;
    timesheetApi.listStaffTimesheets.mockResolvedValue({
      timesheets: [timesheetWithoutPreview],
      total: 1,
    });

    renderPayroll("super_admin");

    await waitFor(() => expect(ui.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Couldn't load approved timesheets",
      variant: "destructive",
    })));
    expect(screen.getByLabelText("Due payroll financials"))
      .not.toHaveTextContent("Avery Admin|—|$0.00");
  });

  it("scopes preview and creation to the selected agency, then opens detail with print entry", async () => {
    const user = userEvent.setup();
    renderPayroll("super_admin");

    await user.click(await screen.findByRole("button", { name: "Create invoice for Dana DSP" }));
    await waitFor(() => expect(payrollApi.getPayrollInvoicePreview).toHaveBeenCalledWith(
      expect.objectContaining({ context: { agencyId: "atlas" }, signal: expect.any(AbortSignal) }),
    ));
    expect(screen.getByRole("dialog", { name: "Create payroll invoice" }))
      .toHaveAccessibleDescription(/Review approved shifts/i);
    await user.click(await screen.findByRole("button", { name: "Create invoice" }));

    await waitFor(() => expect(payrollApi.createPayrollInvoice).toHaveBeenCalledWith({
      context: { agencyId: "atlas" },
      payload: {
        employeeId: "employee-1",
        periodStart: "2026-07-27",
        periodEnd: "2026-08-02",
        shiftIds: ["shift-1"],
        rideIds: [],
        expenseIds: [],
      },
      signal: expect.any(AbortSignal),
    }));
    await waitFor(() => expect(ui.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Payroll invoice created",
    })));
  });

  it("aborts a superseded preview and clears its state when the operational agency changes", async () => {
    const first = deferred<typeof preview>();
    const second = deferred<typeof preview>();
    let firstSignal: AbortSignal | undefined;
    payrollApi.getPayrollInvoicePreview.mockImplementation(({ context, signal }: {
      context: { agencyId: string };
      signal?: AbortSignal;
    }) => {
      if (context.agencyId === "atlas") {
        firstSignal = signal;
        return first.promise;
      }
      return second.promise;
    });
    const onConfirm = vi.fn();
    const view = render(
      <Scope actor="super_admin">
        <CreatePayrollInvoiceModal open entry={dueEntry} onClose={vi.fn()} onConfirm={onConfirm} />
      </Scope>,
    );
    await waitFor(() => expect(payrollApi.getPayrollInvoicePreview).toHaveBeenCalledTimes(1));

    view.rerender(
      <Scope actor="super_admin" agency={beacon}>
        <CreatePayrollInvoiceModal open entry={{ ...dueEntry, employeeId: "employee-2", staffName: "Bea Beacon" }} onClose={vi.fn()} onConfirm={onConfirm} />
      </Scope>,
    );
    await waitFor(() => expect(payrollApi.getPayrollInvoicePreview).toHaveBeenCalledWith(
      expect.objectContaining({ context: { agencyId: "beacon" } }),
    ));
    expect(firstSignal?.aborted).toBe(true);
    expect(screen.queryByText("Dana DSP")).not.toBeInTheDocument();

    await act(async () => first.resolve(preview));
    expect(screen.queryByText("Regular shift")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    await act(async () => second.resolve({ ...preview, employeeId: "employee-2", employeeName: "Bea Beacon" }));
  });

  it("loads invoice detail and scopes paid and cancellation mutations", async () => {
    const user = userEvent.setup();
    renderPayroll("super_admin");
    await user.click(screen.getByRole("button", { name: "Generated Payrolls" }));

    await user.click(await screen.findByRole("button", { name: "View invoice" }));
    await waitFor(() => expect(payrollApi.getPayrollInvoiceById).toHaveBeenCalledWith({
      context: { agencyId: "atlas" }, invoiceId: "payroll-1", signal: expect.any(AbortSignal),
    }));
    expect(await screen.findByText("Paystub Invoice")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Paystub Invoice" }))
      .toHaveAccessibleDescription(/Dana DSP/i);
    await user.click(screen.getByRole("button", { name: "Print invoice" }));
    expect(window.print).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close payroll invoice" }));

    await user.click(screen.getByRole("button", { name: "Mark as paid" }));
    await user.click(screen.getByRole("button", { name: "Confirm Mark this payroll invoice as paid?" }));
    await waitFor(() => expect(payrollApi.markPayrollInvoicePaid).toHaveBeenCalledWith({
      context: { agencyId: "atlas" }, invoiceId: "payroll-1", signal: expect.any(AbortSignal),
    }));

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Confirm Cancel this payroll invoice?" }));
    await waitFor(() => expect(payrollApi.cancelPayrollInvoice).toHaveBeenCalledWith({
      context: { agencyId: "atlas" }, invoiceId: "payroll-1", signal: expect.any(AbortSignal),
    }));
  });

  it("aborts a pending mutation on agency switch without stale toast, result, or refetch", async () => {
    const pending = deferred<void>();
    let mutationSignal: AbortSignal | undefined;
    payrollApi.markPayrollInvoicePaid.mockImplementation(({ signal }: { signal?: AbortSignal }) => {
      mutationSignal = signal;
      return pending.promise;
    });
    const user = userEvent.setup();
    const view = renderPayroll("super_admin");
    await user.click(screen.getByRole("button", { name: "Generated Payrolls" }));
    await user.click(await screen.findByRole("button", { name: "Mark as paid" }));
    await user.click(screen.getByRole("button", { name: "Confirm Mark this payroll invoice as paid?" }));
    await waitFor(() => expect(payrollApi.markPayrollInvoicePaid).toHaveBeenCalledTimes(1));

    view.rerender(<Scope actor="super_admin" agency={beacon}><PayrollDashboardPage /></Scope>);
    await waitFor(() => expect(payrollApi.getPayrollDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ context: { agencyId: "beacon" } }),
    ));
    expect(mutationSignal?.aborted).toBe(true);
    const beaconReadCount = payrollApi.getPayrollDashboard.mock.calls.filter(
      ([input]) => input.context.agencyId === "beacon",
    ).length;
    ui.toast.mockClear();

    await act(async () => pending.resolve());
    expect(payrollApi.getPayrollDashboard.mock.calls.filter(
      ([input]) => input.context.agencyId === "beacon",
    )).toHaveLength(beaconReadCount);
    expect(ui.toast).not.toHaveBeenCalled();
    expect(screen.queryByText("Paystub Invoice")).not.toBeInTheDocument();
  });

  it("keeps invalidation agency-specific and does not duplicate active due-list reads", async () => {
    vi.useFakeTimers();
    try {
      renderPayroll("super_admin");
      await act(async () => { await Promise.resolve(); });
      expect(payrollApi.getStaffToPay).toHaveBeenCalledTimes(1);

      invalidatePayrollData("beacon");
      await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve(); });
      expect(payrollApi.getStaffToPay).toHaveBeenCalledTimes(1);

      invalidatePayrollData("atlas");
      await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve(); });
      expect(payrollApi.getStaffToPay).toHaveBeenCalledTimes(2);
      expect(payrollApi.getStaffToPay.mock.calls[1][0].context).toEqual({ agencyId: "atlas" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders employee names as text unless staff capability and a scoped route are both available", () => {
    const onCreateInvoiceClick = vi.fn();
    const view = render(
      <Scope
        actor="super_admin"
        scopeCapabilities={{ ...capabilities, canAccessStaffDirectory: true }}
      >
        <DuePayrollRow entry={dueEntry} variant="desktop" onCreateInvoiceClick={onCreateInvoiceClick} />
      </Scope>,
    );
    expect(screen.getByText("Dana DSP")).not.toBeInstanceOf(HTMLAnchorElement);
    expect(screen.queryByRole("link", { name: "Dana DSP" })).not.toBeInTheDocument();

    view.rerender(
      <Scope
        actor="agency"
        scopeCapabilities={{ ...capabilities, canAccessStaffDirectory: true }}
        directoryRoutes={{ staffDetails: (staffId) => `/agency/dsp-management/${staffId}` }}
      >
        <DuePayrollRow entry={dueEntry} variant="desktop" onCreateInvoiceClick={onCreateInvoiceClick} />
      </Scope>,
    );
    expect(screen.getByRole("link", { name: "Dana DSP" })).toHaveAttribute(
      "href", "/agency/dsp-management/employee-1",
    );
  });

  it("lazily registers payroll beneath the existing super-admin billing workspace", () => {
    const findRoute = (routes: typeof router.routes, path: string): (typeof router.routes)[number] | undefined => {
      for (const route of routes) {
        if (route.path === path) return route;
        const nested = route.children ? findRoute(route.children, path) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    const billingRoute = findRoute(router.routes, "/super-admin/billing");
    expect(billingRoute?.children?.map((child) => child.path)).toContain("payroll-management");
  });
});
