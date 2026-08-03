import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import ExpensesHistoryTable from "@/pages/agency/billing/expenses/components/ExpensesHistoryTable";
import PendingExpensesTable from "@/pages/agency/billing/expenses/components/PendingExpensesTable";
import RecentActivityTable from "@/pages/agency/billing/financial-overview/components/RecentActivityTable";
import type { RecentActivity } from "@/pages/agency/billing/shared/types";
import type { AgencyAware } from "../types";

const expense = (
  agencyId: string,
  agencyName: string,
): AgencyAware<AgencyExpenseListItem> => ({
  id: "expense-1",
  agencyId,
  agencyName,
  employeeId: "employee-1",
  employeeUid: "staff-1",
  employeeName: "Avery Staff",
  amount: 42,
  category: "Travel",
  message: "Mileage reimbursement",
  receiptUrl: "https://example.test/receipt",
  status: "pending",
  date: "2026-08-01",
  submittedAt: "2026-08-01T12:00:00.000Z",
  reviewedAt: null,
  reviewerNotes: null,
  payrollInvoiceId: null,
});

const activity = (
  agencyId: string,
  agencyName: string,
): AgencyAware<RecentActivity> => ({
  id: "activity-1",
  agencyId,
  agencyName,
  date: "Aug 1, 2026",
  module: "Payroll",
  description: "Payroll invoice created",
  amount: 420,
  status: "pending",
});

describe("network expense and overview table parity", () => {
  it("rejects network rows without canonical agency identity", () => {
    const missingAgency = {
      ...expense("atlas", "Atlas Care"),
      agencyId: undefined,
      agencyName: undefined,
    };

    expect(() =>
      render(
        // @ts-expect-error Network tables require canonical agency identity.
        <PendingExpensesTable
          expenses={[missingAgency]}
          showAgency
          onApprove={vi.fn()}
          onDecline={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    ).toThrow("Network expense rows require agencyId and agencyName");

    const missingActivityAgency = {
      ...activity("atlas", "Atlas Care"),
      agencyId: undefined,
      agencyName: undefined,
    };
    expect(() =>
      render(
        // @ts-expect-error Network activity requires canonical agency identity.
        <RecentActivityTable activity={[missingActivityAgency]} showAgency />,
      ),
    ).toThrow("Network activity rows require agencyId and agencyName");
  });

  it("keeps agency tables unchanged without Agency headers or labels", () => {
    render(
      <>
        <PendingExpensesTable
          expenses={[expense("atlas", "Atlas Care")]}
          onApprove={vi.fn()}
          onDecline={vi.fn()}
          onDelete={vi.fn()}
        />
        <ExpensesHistoryTable
          expenses={[expense("atlas", "Atlas Care")]}
          totalCount={1}
          hasMore={false}
          page={1}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
        />
        <RecentActivityTable activity={[activity("atlas", "Atlas Care")]} />
      </>,
    );

    expect(screen.queryByText("Agency")).not.toBeInTheDocument();
    expect(screen.queryByText("Atlas Care")).not.toBeInTheDocument();
    expect(screen.getAllByText("Avery Staff").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Payroll invoice created").length,
    ).toBeGreaterThan(0);
  });

  it("renders network agency identity in desktop rows and mobile cards while preserving row agency actions", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const atlas = expense("atlas", "Atlas Care");
    const beacon = expense("beacon", "Beacon Supports");
    render(
      <>
        <PendingExpensesTable
          expenses={[atlas, beacon]}
          showAgency
          onApprove={onApprove}
          onDecline={vi.fn()}
          onDelete={vi.fn()}
        />
        <ExpensesHistoryTable
          expenses={[atlas, beacon]}
          totalCount={2}
          hasMore={false}
          page={1}
          showAgency
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
        />
        <RecentActivityTable
          activity={[
            activity("atlas", "Atlas Care"),
            activity("beacon", "Beacon Supports"),
          ]}
          showAgency
        />
      </>,
    );

    expect(screen.getAllByText("Agency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Beacon Supports").length).toBeGreaterThan(1);

    await user.click(
      screen.getAllByRole("button", { name: "Actions for Avery Staff" })[0]!,
    );
    await user.click(screen.getByRole("menuitem", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "atlas", id: "expense-1" }),
    );
  });

  it("keeps visible expense and activity rows during a background refresh and disables cursor controls", async () => {
    const user = userEvent.setup();
    const onLoadMoreExpenses = vi.fn();
    const onLoadMoreActivity = vi.fn();
    const rows = [expense("atlas", "Atlas Care")];
    const activityRows = [activity("atlas", "Atlas Care")];
    const { rerender } = render(
      <>
        <ExpensesHistoryTable
          expenses={rows}
          totalCount={1}
          hasMore
          page={1}
          showAgency
          isRefetching
          nextCursor="expenses-page-2"
          onLoadMore={onLoadMoreExpenses}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
        />
        <RecentActivityTable
          activity={activityRows}
          showAgency
          isRefetching
          nextCursor="activity-page-2"
          onLoadMore={onLoadMoreActivity}
        />
      </>,
    );

    expect(screen.getAllByText("Avery Staff").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Payroll invoice created").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Load more expenses" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Load more recent activity" }),
    ).toBeDisabled();

    rerender(
      <>
        <ExpensesHistoryTable
          expenses={rows}
          totalCount={1}
          hasMore
          page={1}
          showAgency
          nextCursor="expenses-page-2"
          onLoadMore={onLoadMoreExpenses}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
        />
        <RecentActivityTable
          activity={activityRows}
          showAgency
          nextCursor="activity-page-2"
          onLoadMore={onLoadMoreActivity}
        />
      </>,
    );

    await user.click(
      screen.getByRole("button", { name: "Load more expenses" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Load more recent activity" }),
    );
    expect(onLoadMoreExpenses).toHaveBeenCalledTimes(1);
    expect(onLoadMoreActivity).toHaveBeenCalledTimes(1);
  });
});
