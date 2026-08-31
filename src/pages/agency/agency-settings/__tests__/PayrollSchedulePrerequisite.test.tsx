import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PayrollSchedulePrerequisite from "../components/PayrollSchedulePrerequisite";

const loadSchedule = vi.fn();
let scheduleQuery: { data?: unknown; isFetching: boolean; error?: unknown };
vi.mock("@/features/payroll/api/agencyPayrollEndpoints", () => ({
  useLazyGetAgencyPayrollScheduleQuery: () => [loadSchedule, scheduleQuery],
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const prerequisite = (state: "waiting_for_company" | "setup_required" | "needs_attention" | "complete") => ({
  state,
  recoveryAction: state === "needs_attention" ? "correct_pay_schedule" : null,
  timeZone: "America/Chicago",
  frequency: "weekly",
  payrollStartDate: state === "needs_attention" || state === "complete" ? "2026-08-31" : null,
  firstPeriodEnd: state === "needs_attention" || state === "complete" ? "2026-09-14" : null,
  firstPayday: state === "needs_attention" || state === "complete" ? "2026-09-18" : null,
  secondPayday: null,
  compatibilityCode: state === "needs_attention" ? "approval_deadline_incompatible" : null,
  compatibilityMessage: state === "needs_attention" ? "Check's approval deadline must be after payroll period close." : null,
  nextPeriodStart: state === "complete" ? "2026-08-31" : null,
  nextPeriodEnd: state === "complete" ? "2026-09-06" : null,
  nextPayday: state === "complete" ? "2026-09-11" : null,
  nextApprovalDeadline: state === "needs_attention" ? "2026-09-14T05:00:00.000Z" : state === "complete" ? "2026-09-04T17:00:00.000Z" : null,
  lastReconciledAt: state === "complete" ? "2026-08-30T12:00:00.000Z" : null,
});
const projection = (state: ReturnType<typeof prerequisite>["state"], revision = 4) => ({
  projectionRevision: revision,
  schedulePrerequisite: prerequisite(state),
  payrollActivation: { status: state === "complete" ? "ready" : "blocked", blocker: state === "complete" ? null : "pay_schedule_required" },
});

async function chooseCalendarDate(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  accessibleDayName: RegExp,
) {
  await user.click(screen.getByRole("button", { name: label }));
  await user.click(screen.getByRole("button", { name: accessibleDayName }));
}

describe("PayrollSchedulePrerequisite", () => {
  beforeEach(() => {
    loadSchedule.mockReset();
    scheduleQuery = { isFetching: false };
  });

  it.each([
    ["waiting_for_company", "Waiting for company connection"],
    ["setup_required", "Set up payroll schedule"],
    ["needs_attention", "Payroll schedule needs attention"],
    ["complete", "Payroll schedule ready"],
  ] as const)("renders the %s state", (state, copy) => {
    render(<PayrollSchedulePrerequisite scope={scope} projection={projection(state) as never} disabled={false} onCommand={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Payroll schedule prerequisite" })).toHaveTextContent(copy);
  });

  it("validates every setup field independently and connects visible errors", async () => {
    const user = userEvent.setup();
    render(<PayrollSchedulePrerequisite scope={scope} projection={projection("setup_required") as never} disabled={false} onCommand={vi.fn()} />);

    for (const label of ["Payroll tracking start date", "First pay period end date", "First scheduled payday"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    await user.selectOptions(screen.getByLabelText("Pay frequency"), "");
    await user.click(screen.getByRole("button", { name: "Create payroll schedule" }));
    for (const [label, errorId, message] of [
      ["Pay frequency", "schedule-frequency-error", "Select a supported pay frequency."],
      ["Payroll tracking start date", "schedule-payrollStartDate-error", "Enter a valid payroll tracking start date."],
      ["First pay period end date", "schedule-firstPeriodEnd-error", "Enter a valid first pay period end date."],
      ["First scheduled payday", "schedule-firstPayday-error", "Enter a valid first scheduled payday."],
    ]) {
      const control = label === "Pay frequency"
        ? screen.getByLabelText(label)
        : screen.getByRole("button", { name: label });
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(control).toHaveAttribute("aria-describedby", errorId);
      expect(document.getElementById(errorId)).toHaveAttribute("role", "alert");
      expect(document.getElementById(errorId)).toHaveTextContent(message);
    }

    await user.selectOptions(screen.getByLabelText("Pay frequency"), "semimonthly");
    await user.click(screen.getByRole("button", { name: "Create payroll schedule" }));
    const secondPayday = screen.getByRole("button", { name: "Second scheduled payday" });
    expect(secondPayday).toHaveAttribute("aria-invalid", "true");
    expect(secondPayday).toHaveAttribute("aria-describedby", "schedule-secondPayday-error");
    expect(document.getElementById("schedule-secondPayday-error")).toHaveAttribute("role", "alert");
    expect(document.getElementById("schedule-secondPayday-error")).toHaveTextContent("Enter a valid second scheduled payday.");
  });

  it("submits calendar-selected dates with the schedule command", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-01T12:00:00Z"));
    try {
      const onCommand = vi.fn();
      render(<PayrollSchedulePrerequisite scope={scope} projection={projection("setup_required") as never} disabled={false} onCommand={onCommand} />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTimeAsync });
      await user.selectOptions(screen.getByLabelText("Pay frequency"), "weekly");
      await chooseCalendarDate(user, "Payroll tracking start date", /monday, august 3rd, 2026/i);
      await chooseCalendarDate(user, "First pay period end date", /friday, august 14th, 2026/i);
      await chooseCalendarDate(user, "First scheduled payday", /friday, august 21st, 2026/i);

      await user.click(screen.getByRole("button", { name: "Create payroll schedule" }));

      expect(onCommand).toHaveBeenCalledWith({
        command: "create_pay_schedule",
        schedule: {
          frequency: "weekly",
          payrollStartDate: "2026-08-03",
          firstPeriodEnd: "2026-08-14",
          firstPayday: "2026-08-21",
          secondPayday: "",
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("hydrates an empty frequency on setup transition without overwriting user input", () => {
    const waiting = { ...projection("waiting_for_company"), schedulePrerequisite: { ...prerequisite("waiting_for_company"), frequency: null } };
    const view = render(<PayrollSchedulePrerequisite scope={scope} projection={waiting as never} disabled={false} onCommand={vi.fn()} />);

    const semimonthly = { ...projection("setup_required"), schedulePrerequisite: { ...prerequisite("setup_required"), frequency: "semimonthly" } };
    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={semimonthly as never} disabled={false} onCommand={vi.fn()} />);
    expect(screen.getByLabelText("Pay frequency")).toHaveValue("semimonthly");

    fireEvent.change(screen.getByLabelText("Pay frequency"), { target: { value: "monthly" } });
    const refreshed = { ...projection("setup_required", 5), schedulePrerequisite: { ...prerequisite("setup_required"), frequency: "weekly" } };
    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={refreshed as never} disabled={false} onCommand={vi.fn()} />);
    expect(screen.getByLabelText("Pay frequency")).toHaveValue("monthly");
  });

  it("makes no details request while complete is collapsed and reuses the revision cache", async () => {
    const user = userEvent.setup();
    const view = render(<PayrollSchedulePrerequisite scope={scope} projection={projection("complete", 4) as never} disabled={false} onCommand={vi.fn()} />);
    const toggle = screen.getByRole("button", { name: "View upcoming payroll dates" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(loadSchedule).not.toHaveBeenCalled();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(loadSchedule).toHaveBeenCalledTimes(1));
    expect(loadSchedule).toHaveBeenLastCalledWith({ ...scope, projectionRevision: 4, view: "details" }, true);

    scheduleQuery = { isFetching: false, data: { view: "details", projectionRevision: 4, current: {}, periods: [] } };
    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={projection("complete", 4) as never} disabled={false} onCommand={vi.fn()} />);
    await user.click(toggle);
    await user.click(toggle);
    expect(loadSchedule).toHaveBeenCalledTimes(1);

    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={projection("complete", 5) as never} disabled={false} onCommand={vi.fn()} />);
    await waitFor(() => expect(loadSchedule).toHaveBeenCalledTimes(2));
    expect(loadSchedule).toHaveBeenLastCalledWith({ ...scope, projectionRevision: 5, view: "details" }, true);
  });

  it("shows four expanded periods with payday primary and deadline secondary", async () => {
    const user = userEvent.setup();
    scheduleQuery = { isFetching: false, data: {
      view: "details", projectionRevision: 4, current: {},
      periods: [1, 2, 3, 4].map((index) => ({ periodStart: `2026-09-${String(index).padStart(2, "0")}`, periodEnd: `2026-09-${String(index + 6).padStart(2, "0")}`, payday: `2026-09-${String(index + 10).padStart(2, "0")}`, approvalDeadline: `2026-09-${String(index + 8).padStart(2, "0")}T17:00:00.000Z` })),
    } };
    render(<PayrollSchedulePrerequisite scope={scope} projection={projection("complete") as never} disabled={false} onCommand={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "View upcoming payroll dates" }));
    const periods = screen.getAllByRole("listitem");
    expect(periods).toHaveLength(4);
    expect(within(periods[0]).getByText("Sep 11, 2026")).toHaveClass("font-semibold");
    expect(within(periods[0]).getByText(/approval deadline/i)).toHaveClass("text-xs");
  });

  it("shows a complete summary and expanded schedule status metadata", async () => {
    const user = userEvent.setup();
    const ready = projection("complete");
    ready.schedulePrerequisite = {
      ...ready.schedulePrerequisite,
      frequency: "biweekly",
      nextPeriodStart: "2026-09-01",
      nextPeriodEnd: "2026-09-14",
      nextPayday: "2026-09-18",
    };
    scheduleQuery = { isFetching: false, data: {
      view: "details", projectionRevision: 4,
      current: { frequency: "biweekly", payrollStartDate: "2026-08-31", compatible: true },
      periods: [1, 2, 3, 4].map((index) => ({ periodStart: `2026-09-${String(index).padStart(2, "0")}`, periodEnd: `2026-09-${String(index + 6).padStart(2, "0")}`, payday: `2026-09-${String(index + 10).padStart(2, "0")}`, approvalDeadline: `2026-09-${String(index + 8).padStart(2, "0")}T17:00:00.000Z` })),
    } };
    render(<PayrollSchedulePrerequisite scope={scope} projection={ready as never} disabled={false} onCommand={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Biweekly · Active · Next period Sep 1–Sep 14 · Payday Sep 18");
    await user.click(screen.getByRole("button", { name: "View upcoming payroll dates" }));
    expect(screen.getByText("Payroll tracking start")).toBeInTheDocument();
    expect(screen.getByText("Compatible")).toBeInTheDocument();
    expect(screen.getByText("Last reconciled")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("lets an unlinked incompatible attempt revise its prefilled schedule instead of requesting options", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn().mockResolvedValue(true);
    const attention = projection("needs_attention");
    attention.schedulePrerequisite = { ...attention.schedulePrerequisite, recoveryAction: "create_pay_schedule" };
    render(<PayrollSchedulePrerequisite scope={scope} projection={attention as never} disabled={false} onCommand={onCommand} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/period end Sep 14, 2026/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/deadline Sep 14, 2026/i);
    expect(screen.queryByRole("button", { name: "Review compatible paydays" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Payroll tracking start date" })).getByDisplayValue("Aug 31, 2026")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "First pay period end date" })).getByDisplayValue("Sep 14, 2026")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "First scheduled payday" })).getByDisplayValue("Sep 18, 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create payroll schedule" }));
    expect(onCommand).toHaveBeenCalledWith({ command: "create_pay_schedule", schedule: expect.objectContaining({ firstPayday: "2026-09-18" }) });
  });

  it("keeps correction options read-only until separate confirmation", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn().mockResolvedValue(true);
    let finishReconciliation!: (value: boolean) => void;
    const onReviewOptions = vi.fn(() => new Promise<boolean>((resolve) => { finishReconciliation = resolve; }));
    const view = render(<PayrollSchedulePrerequisite scope={scope} projection={projection("needs_attention") as never} disabled={false} onCommand={onCommand} onReviewOptions={onReviewOptions} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Check's approval deadline must be after payroll period close.");

    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));
    expect(onReviewOptions).toHaveBeenCalledOnce();
    expect(loadSchedule).not.toHaveBeenCalled();
    finishReconciliation(true);
    await waitFor(() => expect(loadSchedule).toHaveBeenCalledWith({ ...scope, projectionRevision: 4, view: "options" }, true));
    scheduleQuery = { isFetching: false, data: { view: "options", projectionRevision: 4, current: { frequency: "biweekly", payrollStartDate: "2026-08-31", firstPeriodEnd: "2026-09-14", firstPayday: "2026-09-18" }, choices: [
      { firstPayday: "2026-09-11", approvalDeadline: "2026-09-08T17:00:00.000Z", recommended: true },
      { firstPayday: "2026-09-18", approvalDeadline: "2026-09-15T17:00:00.000Z", recommended: false },
    ] } };
    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={projection("needs_attention") as never} disabled={false} onCommand={onCommand} />);

    expect(screen.getByText("Current schedule").parentElement).toHaveTextContent("Sep 14, 2026");
    expect(screen.getByText(/updates the existing linked Check schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/future inactive payroll period jobs regenerate/i)).toBeInTheDocument();
    expect(screen.getByText(/existing payroll runs remain unchanged/i)).toBeInTheDocument();
    expect(screen.getByText(/filing authorization may be required/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /sep 11, 2026/i }));
    expect(onCommand).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm payroll schedule correction" }));
    expect(onCommand).toHaveBeenCalledOnce();
    expect(onCommand).toHaveBeenCalledWith({ command: "correct_pay_schedule", selectedFirstPayday: "2026-09-11" });
  });

  it("shows the selected correction as pending until terminal refresh", async () => {
    const user = userEvent.setup();
    scheduleQuery = { isFetching: false, data: { view: "options", projectionRevision: 4, current: {}, choices: [
      { firstPayday: "2026-09-11", approvalDeadline: "2026-09-08T17:00:00.000Z", recommended: true },
    ] } };
    const props = {
      scope,
      projection: projection("needs_attention") as never,
      disabled: false,
      onCommand: vi.fn().mockResolvedValue(true),
      onReviewOptions: vi.fn().mockResolvedValue(true),
    };
    const view = render(<PayrollSchedulePrerequisite {...props} />);

    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));
    await user.click(screen.getByRole("radio", { name: /sep 11, 2026/i }));
    view.rerender(<PayrollSchedulePrerequisite {...props} correctionPending />);

    const pendingButton = screen.getByRole("button", { name: "Applying payroll schedule correction…" });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /sep 11, 2026/i })).toBeChecked();
  });

  it("clears a failed correction choice and refreshes compatible paydays", async () => {
    const user = userEvent.setup();
    const retainedOptions = { view: "options", projectionRevision: 4, current: {}, choices: [
      { firstPayday: "2026-09-11", approvalDeadline: "2026-09-08T17:00:00.000Z", recommended: true },
    ] };
    scheduleQuery = { isFetching: false, data: retainedOptions };
    const props = {
      scope,
      projection: projection("needs_attention") as never,
      disabled: false,
      onCommand: vi.fn().mockResolvedValue(true),
      onReviewOptions: vi.fn().mockResolvedValue(true),
    };
    const view = render(<PayrollSchedulePrerequisite {...props} />);

    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));
    await user.click(screen.getByRole("radio", { name: /sep 11, 2026/i }));
    view.rerender(<PayrollSchedulePrerequisite {...props} correctionError="The payroll schedule correction could not be confirmed. Review compatible paydays before trying again." />);

    expect(screen.getAllByRole("alert").at(-1)).toHaveTextContent(/correction could not be confirmed/i);
    await waitFor(() => expect(loadSchedule).toHaveBeenCalledWith({ ...scope, projectionRevision: 4, view: "options" }, false));
    expect(screen.getByRole("radio", { name: /sep 11, 2026/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm payroll schedule correction" })).toBeDisabled();

    scheduleQuery = { isFetching: true, data: retainedOptions };
    view.rerender(<PayrollSchedulePrerequisite {...props} correctionError="The payroll schedule correction could not be confirmed. Review compatible paydays before trying again." />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading compatible paydays");
    expect(screen.queryByRole("radio", { name: /sep 11, 2026/i })).not.toBeInTheDocument();

    scheduleQuery = { isFetching: false, data: retainedOptions, error: new Error("refresh failed") };
    view.rerender(<PayrollSchedulePrerequisite {...props} correctionError="The payroll schedule correction could not be confirmed. Review compatible paydays before trying again." />);
    expect(screen.getByText("Compatible paydays could not be loaded.")).toHaveAttribute("role", "alert");
    expect(screen.queryByRole("radio", { name: /sep 11, 2026/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm payroll schedule correction" })).not.toBeInTheDocument();
  });

  it("retries a failed options request and renders the successful response", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();
    const view = render(<PayrollSchedulePrerequisite scope={scope} projection={projection("needs_attention") as never} disabled={false} onCommand={onCommand} onReviewOptions={vi.fn().mockResolvedValue(true)} />);

    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));
    expect(loadSchedule).toHaveBeenCalledTimes(1);
    scheduleQuery = { isFetching: false, error: new Error("temporary failure") };
    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={projection("needs_attention") as never} disabled={false} onCommand={onCommand} />);

    await user.click(screen.getByRole("button", { name: "Try loading compatible paydays again" }));
    expect(loadSchedule).toHaveBeenCalledTimes(2);
    expect(loadSchedule).toHaveBeenLastCalledWith({ ...scope, projectionRevision: 4, view: "options" }, false);

    scheduleQuery = { isFetching: false, data: { view: "options", projectionRevision: 4, current: {}, choices: [
      { firstPayday: "2026-09-11", approvalDeadline: "2026-09-08T17:00:00.000Z", recommended: true },
    ] } };
    view.rerender(<PayrollSchedulePrerequisite scope={scope} projection={projection("needs_attention") as never} disabled={false} onCommand={onCommand} />);
    expect(screen.getByRole("radio", { name: /sep 11, 2026/i })).toBeInTheDocument();
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("renders date-only Check deadlines without shifting the calendar day", async () => {
    const user = userEvent.setup();
    const attention = projection("needs_attention");
    attention.schedulePrerequisite = { ...attention.schedulePrerequisite, timeZone: "America/New_York" };
    scheduleQuery = { isFetching: false, data: { view: "options", projectionRevision: 4, current: {}, choices: [
      { firstPayday: "2026-09-03", approvalDeadline: "2026-08-31", recommended: true },
    ] } };

    render(<PayrollSchedulePrerequisite scope={scope} projection={attention as never} disabled={false} onCommand={vi.fn()} onReviewOptions={vi.fn().mockResolvedValue(true)} />);
    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));

    expect(await screen.findByText("Approval deadline: Aug 31, 2026")).toBeInTheDocument();
  });

  it("explains when Check returns no compatible paydays", async () => {
    const user = userEvent.setup();
    scheduleQuery = { isFetching: false, data: {
      view: "options",
      projectionRevision: 4,
      current: { firstPeriodEnd: "2026-09-14" },
      choices: [],
    } };

    render(<PayrollSchedulePrerequisite scope={scope} projection={projection("needs_attention") as never} disabled={false} onCommand={vi.fn()} onReviewOptions={vi.fn().mockResolvedValue(true)} />);
    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));

    expect(await screen.findByRole("status", { name: "No compatible paydays" })).toHaveTextContent(/after Sep 14, 2026/i);
    expect(screen.getByRole("button", { name: "Confirm payroll schedule correction" })).toBeDisabled();
  });

  it("renders approval deadlines in the agency timezone", async () => {
    const user = userEvent.setup();
    const attention = projection("needs_attention");
    attention.schedulePrerequisite = { ...attention.schedulePrerequisite, timeZone: "America/New_York" };
    scheduleQuery = { isFetching: false, data: { view: "options", projectionRevision: 4, current: {}, choices: [
      { firstPayday: "2026-09-11", approvalDeadline: "2026-09-08T17:00:00.000Z", recommended: true },
    ] } };
    render(<PayrollSchedulePrerequisite scope={scope} projection={attention as never} disabled={false} onCommand={vi.fn()} onReviewOptions={vi.fn().mockResolvedValue(true)} />);
    await user.click(screen.getByRole("button", { name: "Review compatible paydays" }));
    expect(await screen.findByText(/1:00 PM EDT/)).toBeInTheDocument();
  });

  it("never exposes provider IDs in visible or accessibility text", async () => {
    const providerId = "pay_schedule_private_123";
    const user = userEvent.setup();
    scheduleQuery = { isFetching: false, data: { view: "details", projectionRevision: 4, providerId, current: { providerId }, periods: [] } };
    const { container } = render(<PayrollSchedulePrerequisite scope={scope} projection={{ ...projection("complete"), providerId } as never} disabled={false} onCommand={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "View upcoming payroll dates" }));
    expect(container).not.toHaveTextContent(providerId);
    expect(container.querySelector(`[aria-label*="${providerId}"]`)).toBeNull();
    expect(container.querySelector(`[aria-describedby*="${providerId}"]`)).toBeNull();
  });
});
