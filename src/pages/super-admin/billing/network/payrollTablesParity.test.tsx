import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DuePayrollTable from "@/pages/agency/billing/payroll/components/DuePayrollTable";
import SavedPayrollTable from "@/pages/agency/billing/payroll/components/SavedPayrollTable";
import StaffTimesheetsTable from "@/pages/agency/billing/staff-timesheets/StaffTimesheetsTable";
import type { DuePayrollEntry, PayrollInvoiceListItem } from "@/lib/api/payroll";
import type { StaffTimesheet } from "@/lib/api/staff-timesheets";
import type { AgencyAware } from "../types";

vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({
    capabilities: { canAccessStaffDirectory: false },
    directoryRoutes: undefined,
  }),
}));

const dueEntry = (agencyId: string, agencyName: string): AgencyAware<DuePayrollEntry> => ({
  id: `due-${agencyId}`,
  employeeId: "employee-1",
  staffName: "Avery Staff",
  staffId: "STF-001",
  hoursWorked: "24",
  dateRangeStart: "2026-07-01",
  dateRangeEnd: "2026-07-14",
  paymentDetails: "Weekly",
  paRate: "$24.00",
  grossAmount: 576,
  agencyId,
  agencyName,
});

const invoice = (agencyId: string, agencyName: string): AgencyAware<PayrollInvoiceListItem> => ({
  id: `payroll-${agencyId}`,
  invoiceNumber: `PAY-${agencyId.toUpperCase()}`,
  status: "pending",
  grossAmount: 576,
  employeeId: "employee-1",
  employeeName: "Avery Staff",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-14",
  totalHours: 24,
  shiftCount: 3,
  createdAt: "2026-07-15T00:00:00.000Z",
  paidAt: null,
  agencyId,
  agencyName,
});

const timesheet = (agencyId: string, agencyName: string): AgencyAware<StaffTimesheet> => ({
  id: `timesheet-${agencyId}`,
  agencyId,
  agencyName,
  staffUid: "staff-1",
  staffName: "Avery Staff",
  role: "DSP",
  mode: "ddd",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-14",
  entries: [],
  totalHours: 24,
  signature: null,
  signatureInfo: "",
  status: "pending",
  reviewedAt: null,
  reviewedBy: null,
  reviewerNotes: null,
  payrollInvoiceId: null,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
});

describe("network payroll and timesheet table parity", () => {
  it("keeps agency mode unchanged without agency cells or staff grouping", () => {
    render(
      <>
        <DuePayrollTable entries={[dueEntry("atlas", "Atlas Care")]} onCreateInvoiceClick={vi.fn()} />
        <SavedPayrollTable invoices={[invoice("atlas", "Atlas Care")]} onViewInvoice={vi.fn()} />
      </>,
    );

    expect(screen.queryByText("Agency")).not.toBeInTheDocument();
    expect(screen.queryByText("Atlas Care")).not.toBeInTheDocument();
    expect(screen.queryByTestId("payroll-staff-group-atlas:employee-1")).not.toBeInTheDocument();
  });

  it("renders agency-aware due and saved payroll rows on desktop and mobile with row-bound actions", async () => {
    const user = userEvent.setup();
    const onCreateInvoiceClick = vi.fn();
    const onViewInvoice = vi.fn();
    const onMarkPaid = vi.fn();
    const onCancel = vi.fn();
    const rows = [dueEntry("atlas", "Atlas Care"), dueEntry("beacon", "Beacon Supports")];
    const invoices = [invoice("atlas", "Atlas Care"), invoice("beacon", "Beacon Supports")];

    render(
      <>
        <DuePayrollTable entries={rows} showAgency onCreateInvoiceClick={onCreateInvoiceClick} />
        <SavedPayrollTable
          invoices={invoices}
          showAgency
          onViewInvoice={onViewInvoice}
          onMarkPaid={onMarkPaid}
          onCancel={onCancel}
        />
      </>,
    );

    expect(screen.getAllByText("Agency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Beacon Supports").length).toBeGreaterThan(1);
    expect(screen.getByTestId("payroll-staff-group-atlas:employee-1")).toBeVisible();
    expect(screen.getByTestId("payroll-staff-group-beacon:employee-1")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Payroll actions" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: "Create payroll invoice" }));
    expect(onCreateInvoiceClick).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));

    const savedRow = screen.getAllByText("PAY-ATLAS")[0]!.parentElement!;
    await user.click(within(savedRow).getByRole("button", { name: "View invoice" }));
    expect(onViewInvoice).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));
    await user.click(within(savedRow).getByRole("button", { name: "Mark as paid" }));
    expect(onMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));
    await user.click(within(savedRow).getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));
  });

  it("retains visible rows during refresh and exposes the shared cursor controls", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <DuePayrollTable
        entries={[dueEntry("atlas", "Atlas Care")]}
        isRefetching
        nextCursor="due-page-2"
        onLoadMore={onLoadMore}
        showAgency
        onCreateInvoiceClick={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Avery Staff").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Load more payroll staff" })).toBeDisabled();

    rerender(
      <DuePayrollTable
        entries={[dueEntry("atlas", "Atlas Care")]}
        nextCursor="due-page-2"
        onLoadMore={onLoadMore}
        showAgency
        onCreateInvoiceClick={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Load more payroll staff" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("keeps same-staff timesheets separate by agency and retains selected row agency for view, approval, and rejection", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <StaffTimesheetsTable
        timesheets={[timesheet("atlas", "Atlas Care"), timesheet("beacon", "Beacon Supports")]}
        showAgency
        onView={onView}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    expect(screen.getByTestId("timesheet-staff-group-atlas:staff-1")).toBeVisible();
    expect(screen.getByTestId("timesheet-staff-group-beacon:staff-1")).toBeVisible();
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Beacon Supports").length).toBeGreaterThan(1);

    await user.click(screen.getAllByRole("button", { name: "Timesheet actions" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: "View" }));
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));

    await user.click(screen.getAllByRole("button", { name: "Timesheet actions" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));

    await user.click(screen.getAllByRole("button", { name: "Timesheet actions" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: "Reject" }));
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));
  });
});
