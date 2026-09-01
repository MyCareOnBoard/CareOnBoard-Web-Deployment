import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpcomingPayrollPanel } from "./UpcomingPayrollPanel";

const api = vi.hoisted(() => ({
  hook: vi.fn(),
  refetch: vi.fn(),
  forceBuildHook: vi.fn(),
  forceBuild: vi.fn(),
  statusHook: vi.fn(),
  forceBuildState: { isLoading: false } as Record<string, unknown>,
  statusState: { currentData: undefined, isError: false } as Record<string, unknown>,
}));
const navigation = vi.hoisted(() => vi.fn());

vi.mock("../../api/payrollRunEndpoints", () => ({
  useGetUpcomingPayrollQuery: (...args: unknown[]) => api.hook(...args),
  useForceBuildUpcomingPayrollMutation: () => api.forceBuildHook(),
  useGetForceBuildStatusQuery: (...args: unknown[]) => api.statusHook(...args),
}));

vi.mock("react-router", () => ({
  useNavigate: () => navigation,
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1", mode: "ddd" as const };

const upcoming = (overrides: Record<string, unknown> = {}) => ({
  kind: "upcoming" as const,
  mode: "ddd" as const,
  projectionRevision: 8,
  forceBuild: { enabled: true as const, reasonCode: null },
  periodStart: "2026-08-24",
  periodEnd: "2026-09-06",
  payday: "2026-09-11",
  totals: { regularHours: 40, overtimeHours: 4, totalHours: 44, grossEarningsCents: 88_000, reimbursementCents: 5_000, totalDueCents: 93_000 },
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
    reimbursementCents: 5_000,
    totalDueCents: 93_000,
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
    api.forceBuildHook.mockReset();
    api.forceBuild.mockReset();
    api.statusHook.mockReset();
    navigation.mockReset();
    api.forceBuildState = { isLoading: false };
    api.statusState = { currentData: undefined, isError: false };
    api.hook.mockReturnValue(queryState(upcoming()));
    api.forceBuild.mockReturnValue({
      unwrap: () => Promise.resolve({ buildId: "build-1", state: "queued", pollAfterMs: 2000, attention: null }),
    });
    api.forceBuildHook.mockImplementation(() => [api.forceBuild, api.forceBuildState]);
    api.statusHook.mockImplementation(() => api.statusState);
  });

  it("hides the test action when the server capability is disabled", () => {
    api.hook.mockReturnValue(queryState(upcoming({
      forceBuild: { enabled: false, reasonCode: "permission_required" },
    })));

    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.queryByRole("button", { name: "Build test payrolls now" })).not.toBeInTheDocument();
  });

  it("confirms the exact period before submitting the authoritative fence", async () => {
    const user = userEvent.setup();
    render(<UpcomingPayrollPanel scope={scope} />);

    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Build test payrolls early?");
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "This starts the real sandbox payroll build for Aug 24, 2026 – Sep 6, 2026 now instead of after the period closes. It creates Check sandbox drafts for eligible HHA and DDD payrolls and consumes this test period.",
    );
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    expect(api.forceBuild).toHaveBeenCalledOnce();
    expect(api.forceBuild).toHaveBeenCalledWith({
      ...scope,
      periodStart: "2026-08-24",
      periodEnd: "2026-09-06",
      payday: "2026-09-11",
      expectedProjectionRevision: 8,
    });
  });

  it("shows pointer affordances for enabled build controls and not-allowed affordances while submitting", async () => {
    const user = userEvent.setup();
    const view = render(<UpcomingPayrollPanel scope={scope} />);
    const trigger = screen.getByRole("button", { name: "Build test payrolls now" });

    expect(trigger).toHaveClass("cursor-pointer", "disabled:cursor-not-allowed");
    await user.click(trigger);

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const submit = screen.getByRole("button", { name: "Build test payrolls" });
    expect(cancel).toHaveClass("cursor-pointer", "disabled:cursor-not-allowed");
    expect(submit).toHaveClass("cursor-pointer", "disabled:cursor-not-allowed");

    api.forceBuildState = { isLoading: true };
    view.rerender(<UpcomingPayrollPanel scope={scope} />);

    expect(trigger).toBeDisabled();
    expect(cancel).toBeDisabled();
    expect(submit).toBeDisabled();
  });

  it("keeps the confirmation dialog locked with a busy spinner while the force-build request is pending", async () => {
    const user = userEvent.setup();
    const pendingBuild = new Promise<{
      buildId: string;
      state: "queued";
      pollAfterMs: number;
      attention: null;
    }>(() => undefined);
    api.forceBuild.mockReturnValue({ unwrap: () => pendingBuild });
    const view = render(<UpcomingPayrollPanel scope={scope} />);

    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));
    api.forceBuildState = { isLoading: true };
    view.rerender(<UpcomingPayrollPanel scope={scope} />);

    const dialog = screen.getByRole("dialog");
    const submit = screen.getByRole("button", { name: "Starting test payroll build…" });
    expect(dialog).toBeInTheDocument();
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(submit.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the dialog and polls the returned queued or building build every two seconds", async () => {
    const user = userEvent.setup();
    const view = render(<UpcomingPayrollPanel scope={scope} />);

    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Build test payrolls now" })).toBeDisabled();
    expect(screen.getByRole("status", { name: "Test payroll build status" })).toHaveTextContent(
      "Building test payrolls in Check... This can take a few minutes.",
    );
    expect(screen.getByRole("status", { name: "Test payroll build status" }).querySelector("svg"))
      .toHaveClass("motion-safe:animate-spin");
    expect(api.statusHook).toHaveBeenLastCalledWith(
      { ...scope, buildId: "build-1" },
      { pollingInterval: 2000, refetchOnMountOrArgChange: true },
    );

    api.statusState = {
      currentData: { buildId: "build-1", state: "building", pollAfterMs: 2000, attention: null },
      isError: false,
    };
    view.rerender(<UpcomingPayrollPanel scope={scope} />);

    await waitFor(() => expect(api.statusHook).toHaveBeenLastCalledWith(
      { ...scope, buildId: "build-1" },
      { pollingInterval: 2000, refetchOnMountOrArgChange: true },
    ));
  });

  it("clears dialog, build, errors, and callback guards when agency or mode changes", async () => {
    const user = userEvent.setup();
    const onBuildSucceeded = vi.fn();
    const view = render(<UpcomingPayrollPanel scope={scope} onBuildSucceeded={onBuildSucceeded} />);

    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    view.rerender(<UpcomingPayrollPanel scope={{ ...scope, mode: "hha" }} onBuildSucceeded={onBuildSucceeded} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));
    api.statusState = { currentData: undefined, isError: true };
    view.rerender(<UpcomingPayrollPanel scope={{ ...scope, mode: "hha" }} onBuildSucceeded={onBuildSucceeded} />);
    expect(await screen.findByText(/Build status could not be refreshed/)).toBeInTheDocument();

    view.rerender(<UpcomingPayrollPanel scope={{ ...scope, agencyId: "agency-2" }} onBuildSucceeded={onBuildSucceeded} />);
    await waitFor(() => expect(screen.queryByText(/Build status could not be refreshed/)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Build test payrolls now" })).toBeEnabled();

    api.forceBuild.mockReturnValue({
      unwrap: () => Promise.resolve({ buildId: "build-1", state: "succeeded", pollAfterMs: null, attention: null }),
    });
    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));
    await waitFor(() => expect(onBuildSucceeded).toHaveBeenCalledOnce());

    view.rerender(<UpcomingPayrollPanel scope={{ ...scope, agencyId: "agency-3" }} onBuildSucceeded={onBuildSucceeded} />);
    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));
    await waitFor(() => expect(onBuildSucceeded).toHaveBeenCalledTimes(2));
  });

  it("stops polling and offers a projection refresh when the build needs attention", async () => {
    const user = userEvent.setup();
    const view = render(<UpcomingPayrollPanel scope={scope} />);
    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    api.statusState = {
      currentData: {
        buildId: "build-1",
        state: "needs_attention",
        pollAfterMs: null,
        attention: {
          code: "approval_deadline_elapsed",
          message: "The approval deadline has passed.",
        },
      },
      isError: false,
    };
    view.rerender(<UpcomingPayrollPanel scope={scope} />);

    expect(await screen.findByText(
      "The approval deadline has passed.",
    )).toBeInTheDocument();
    await waitFor(() => expect(api.statusHook).toHaveBeenLastCalledWith(
      { ...scope, buildId: "build-1" },
      { pollingInterval: 0, refetchOnMountOrArgChange: true },
    ));
    await user.click(screen.getByRole("button", { name: "Refresh upcoming payroll" }));
    expect(api.refetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Upcoming payroll" })).toBeInTheDocument();
  });

  it("stops polling and remains Upcoming when the build fails", async () => {
    const user = userEvent.setup();
    const view = render(<UpcomingPayrollPanel scope={scope} />);
    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    api.statusState = {
      currentData: { buildId: "build-1", state: "failed", pollAfterMs: null, attention: null },
      isError: false,
    };
    view.rerender(<UpcomingPayrollPanel scope={scope} />);

    expect(await screen.findByText(
      "Test payrolls could not be built. Nothing was moved to Current. Refresh the page to review the latest payroll state.",
    )).toBeInTheDocument();
    await waitFor(() => expect(api.statusHook).toHaveBeenLastCalledWith(
      { ...scope, buildId: "build-1" },
      { pollingInterval: 0, refetchOnMountOrArgChange: true },
    ));
    expect(screen.getByRole("heading", { name: "Upcoming payroll" })).toBeInTheDocument();
  });

  it("restores the action after the build cannot be started", async () => {
    const user = userEvent.setup();
    api.forceBuild.mockReturnValue({ unwrap: () => Promise.reject(new Error("unavailable")) });
    render(<UpcomingPayrollPanel scope={scope} />);

    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    expect(await screen.findByText(
      "Test payroll build could not be started. Refresh the upcoming payroll and try again.",
    )).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build test payrolls now" })).toBeEnabled();
  });

  it("keeps polling after a transient status read failure", async () => {
    const user = userEvent.setup();
    const view = render(<UpcomingPayrollPanel scope={scope} />);
    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    api.statusState = { currentData: undefined, isError: true };
    view.rerender(<UpcomingPayrollPanel scope={scope} />);

    expect(await screen.findByText(
      "Build status could not be refreshed. We’ll keep checking while this page is open.",
    )).toBeInTheDocument();
    expect(api.statusHook).toHaveBeenLastCalledWith(
      { ...scope, buildId: "build-1" },
      { pollingInterval: 2000, refetchOnMountOrArgChange: true },
    );
  });

  it("reports a succeeded build exactly once without rendering failure copy", async () => {
    const user = userEvent.setup();
    const onBuildSucceeded = vi.fn();
    const view = render(<UpcomingPayrollPanel scope={scope} onBuildSucceeded={onBuildSucceeded} />);
    await user.click(screen.getByRole("button", { name: "Build test payrolls now" }));
    await user.click(screen.getByRole("button", { name: "Build test payrolls" }));

    api.statusState = {
      currentData: { buildId: "build-1", state: "succeeded", pollAfterMs: null, attention: null },
      isError: false,
    };
    view.rerender(<UpcomingPayrollPanel scope={scope} onBuildSucceeded={onBuildSucceeded} />);

    await waitFor(() => expect(onBuildSucceeded).toHaveBeenCalledOnce());
    view.rerender(<UpcomingPayrollPanel scope={scope} onBuildSucceeded={onBuildSucceeded} />);
    expect(onBuildSucceeded).toHaveBeenCalledOnce();
    expect(screen.queryByText(/could not be built|could not be started/)).not.toBeInTheDocument();
  });

  it("shows the approved-work totals, neutral readiness, source detail, and one semantic worker row", () => {
    render(<UpcomingPayrollPanel scope={scope} />);

    expect(screen.getByRole("heading", { name: "Upcoming payroll" })).toBeInTheDocument();
    expect(screen.getByText("Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Workers in period")).toBeInTheDocument();
    expect(screen.getByText("Reimbursements")).toBeInTheDocument();
    expect(screen.getAllByText("Estimated total due").length).toBeGreaterThan(0);
    expect(screen.getByText(/Includes approved earnings, expenses, and mileage reimbursements/i)).toBeInTheDocument();
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

  it("resets to the first page and never retains DDD rows when mode changes", () => {
    const firstPage = upcoming({
      items: [{ ...upcoming().items[0], employeeId: "ddd-first", displayName: "DDD first page" }],
      nextCursor: "page-2",
      hasMore: true,
    });
    const secondPage = upcoming({
      items: [{ ...upcoming().items[0], employeeId: "ddd-second", displayName: "DDD second page" }],
      nextCursor: null,
      hasMore: false,
    });
    const hhaPage = upcoming({
      mode: "hha",
      items: [{ ...upcoming().items[0], employeeId: "hha-first", displayName: "HHA first page" }],
      nextCursor: null,
      hasMore: false,
    });
    api.hook.mockImplementation((args: { mode: "ddd" | "hha"; cursor?: string }) => queryState(
      args.mode === "hha" ? hhaPage : args.cursor ? secondPage : firstPage,
    ));
    const view = render(<UpcomingPayrollPanel scope={scope} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("DDD second page")).toBeInTheDocument();

    api.hook.mockClear();
    view.rerender(<UpcomingPayrollPanel scope={{ ...scope, mode: "hha" }} />);

    expect(api.hook).toHaveBeenCalledOnce();
    expect(api.hook).toHaveBeenCalledWith(
      { ...scope, mode: "hha" },
      { refetchOnMountOrArgChange: true },
    );
    expect(screen.getByText("HHA first page")).toBeInTheDocument();
    expect(screen.queryByText("DDD second page")).not.toBeInTheDocument();
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
