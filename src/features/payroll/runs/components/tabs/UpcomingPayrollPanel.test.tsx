import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpcomingPayrollPanel } from "./UpcomingPayrollPanel";

const api = vi.hoisted(() => ({
  hook: vi.fn(),
  refetch: vi.fn(),
}));
const navigation = vi.hoisted(() => vi.fn());

vi.mock("../../api/payrollRunEndpoints", () => ({
  useGetUpcomingPayrollQuery: (...args: unknown[]) => api.hook(...args),
}));

vi.mock("react-router", () => ({
  useNavigate: () => navigation,
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };

const upcoming = (overrides: Record<string, unknown> = {}) => ({
  kind: "upcoming" as const,
  projectionRevision: 8,
  periodStart: "2026-08-24",
  periodEnd: "2026-09-06",
  payday: "2026-09-11",
  totals: { regularHours: 40, overtimeHours: 4, totalHours: 44, grossEarningsCents: 88_000 },
  employeeCount: 1,
  blockerCount: 1,
  blockerCodes: ["SHIFT_AWAITING_APPROVAL"],
  sourceCounts: { shift: 2, staff_timesheet: 0 },
  items: [{
    employeeId: "employee-1",
    employmentType: "field" as const,
    displayName: "Alex Morgan",
    regularHours: 40,
    overtimeHours: 4,
    grossEarningsCents: 88_000,
    sourceCount: 2,
    sourceCounts: { shift: 2, staff_timesheet: 0 },
    hasBlockers: true,
    blockerCodes: ["SHIFT_AWAITING_APPROVAL"],
  }],
  nextCursor: null,
  hasMore: false,
  asOf: "2026-08-25T12:00:00.000Z",
  ...overrides,
});

const queryState = (currentData: unknown, overrides: Record<string, unknown> = {}) => ({
  data: currentData,
  currentData,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: api.refetch,
  ...overrides,
});

describe("UpcomingPayrollPanel", () => {
  beforeEach(() => {
    api.hook.mockReset();
    api.refetch.mockReset();
    navigation.mockReset();
    api.hook.mockReturnValue(queryState(upcoming()));
  });

  it("shows the approved-work estimate, neutral readiness, source detail, and one semantic worker row", () => {
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("heading", { name: "Upcoming payroll" })).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Estimated earnings from approved work")).toBeInTheDocument();
    expect(screen.getByText("Workers in period")).toBeInTheDocument();
    expect(screen.getByText(/does not include reimbursements or adjustments/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved sources:/)).toBeInTheDocument();
    expect(screen.getAllByText("Not ready yet")).toHaveLength(2);
    expect(screen.getByText("Shift awaiting approval")).toBeInTheDocument();
    expect(screen.getAllByText(/2 shifts/)).toHaveLength(2);
    expect(screen.getByRole("list", { name: "Upcoming payroll workers" })).toBeInTheDocument();
    expect(screen.getAllByTestId("upcoming-payroll-worker-row")).toHaveLength(1);
  });

  it("announces loading without showing stale data for another cursor", () => {
    api.hook.mockReturnValue(queryState(undefined, { isLoading: true, isFetching: true }));
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading upcoming payroll…");
    expect(screen.getByTestId("upcoming-payroll-panel")).toHaveAttribute("aria-busy", "true");
  });

  it("explains when no upcoming pay period is scheduled", () => {
    api.hook.mockReturnValue(queryState({
      kind: "empty",
      projectionRevision: 8,
      emptyReason: "no_upcoming_period",
      items: [],
      nextCursor: null,
      hasMore: false,
      asOf: "2026-08-25T12:00:00.000Z",
    }));
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("heading", { name: "No upcoming payroll scheduled." })).toBeInTheDocument();
    expect(screen.getByText(/next scheduled pay period will appear here/i)).toBeInTheDocument();
  });

  it("takes agency owners to agency settings when their timezone is required", () => {
    api.hook.mockReturnValue(queryState({
      kind: "empty",
      projectionRevision: 8,
      emptyReason: "agency_timezone_required",
      items: [],
      nextCursor: null,
      hasMore: false,
      asOf: "2026-08-25T12:00:00.000Z",
    }));
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("heading", { name: "Set your agency timezone." })).toBeInTheDocument();
    expect(screen.getByText(/correct local pay-period close.*show what’s upcoming/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set agency timezone" }));
    expect(navigation).toHaveBeenCalledWith("/agency/agency-settings?tab=agencyInfo");
    expect(api.refetch).not.toHaveBeenCalled();
  });

  it("offers a focused retry when the upcoming projection cannot be loaded", () => {
    api.hook.mockReturnValue(queryState(undefined, { isError: true }));
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Upcoming payroll couldn’t be loaded.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(api.refetch).toHaveBeenCalledOnce();
  });

  it("surfaces projection-level blockers that are not attached to a displayed worker", () => {
    api.hook.mockReturnValue(queryState(upcoming({
      blockerCount: 0,
      blockerCodes: ["source_blocker_scan_incomplete"],
      items: [{
        ...upcoming().items[0],
        hasBlockers: false,
        blockerCodes: [],
      }],
    })));
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("status")).toHaveTextContent("Payroll estimate needs attention");
    expect(screen.getByText("Source blocker scan incomplete")).toBeInTheDocument();
  });

  it("navigates opaque cursors and resets to the first page when agency scope changes", () => {
    const firstPage = upcoming({ nextCursor: "page-2", hasMore: true, employeeCount: 2 });
    const secondPage = upcoming({
      items: [{
        employeeId: "employee-2",
        employmentType: "staff" as const,
        displayName: "Jordan Lee",
        regularHours: 32,
        overtimeHours: 0,
        grossEarningsCents: 64_000,
        sourceCount: 1,
        sourceCounts: { shift: 0, staff_timesheet: 1 },
        hasBlockers: false,
        blockerCodes: [],
      }],
      nextCursor: null,
      hasMore: false,
      employeeCount: 2,
    });
    api.hook.mockImplementation((args: { cursor?: string }) => (
      queryState(args.cursor === "page-2" ? secondPage : firstPage)
    ));
    const view = render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Upcoming payroll" })).toHaveFocus();
    expect(api.hook).toHaveBeenLastCalledWith(
      { ...scope, cursor: "page-2" },
      { refetchOnMountOrArgChange: true },
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    view.rerender(<UpcomingPayrollPanel scope={{ ...scope, agencyId: "agency-2" }} />);
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(api.hook).toHaveBeenLastCalledWith(
      { ...scope, agencyId: "agency-2" },
      { refetchOnMountOrArgChange: true },
    );
  });

  it("returns to the first page when a later cursor becomes stale", () => {
    const firstPage = upcoming({ nextCursor: "page-2", hasMore: true, employeeCount: 2 });
    api.hook.mockImplementation((args: { cursor?: string }) => args.cursor
      ? queryState(undefined, { isError: true })
      : queryState(firstPage));
    render(<UpcomingPayrollPanel scope={scope} />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to first page" }));

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(api.hook).toHaveBeenLastCalledWith(scope, { refetchOnMountOrArgChange: true });
  });
});
