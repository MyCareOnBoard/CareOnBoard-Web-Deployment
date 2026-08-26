import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { StaffTimesheet } from "@/lib/api/staff-timesheets";

import StaffTimesheetsTable from "./StaffTimesheetsTable";

vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ capabilities: { canAccessStaffDirectory: false } }),
  useOptionalOperationalAgency: () => undefined,
}));

function timesheet(agencyId: string, agencyName: string): StaffTimesheet & { agencyName: string } {
  return {
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
  };
}

describe("StaffTimesheetsTable network rows", () => {
  it("labels the owning agency in mobile cards", () => {
    render(
      <StaffTimesheetsTable
        timesheets={[timesheet("atlas", "Atlas Care")]}
        showAgency
        onView={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    const mobileCard = screen.getAllByText("Avery Staff")
      .map((element) => element.closest("article"))
      .find((element): element is HTMLElement => element !== null);
    expect(mobileCard).toBeTruthy();
    expect(within(mobileCard!).getByText("Agency")).toBeInTheDocument();
    expect(within(mobileCard!).getByText("Atlas Care")).toBeInTheDocument();
  });

  it("separates identical staff by agency and keeps review actions row-bound", async () => {
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
