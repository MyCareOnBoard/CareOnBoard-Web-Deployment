import { Profiler } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listShifts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/shifts", () => ({
  listShifts,
  ShiftStatus: {
    PENDING: "pending",
    AVAILABLE: "available",
    ONGOING: "ongoing",
    COMPLETED: "completed",
    EXPIRED: "expired",
  },
}));

import { ShiftsMonthCalendar } from "./ShiftsMonthCalendar";

function entityShift(id: string, startTime: string, clientName: string, staffName: string) {
  const [clientFirst, clientLast] = clientName.split(" ");
  return {
    id,
    agencyId: "agency-a",
    clientId: "client-a",
    employeeId: "staff-a",
    date: "2026-08-12",
    startTime,
    endTime: "12:00PM",
    status: "pending",
    type: "automatic",
    submissionStatus: "draft",
    approved: false,
    assignedDsp: staffName,
    client: { id: "client-a", firstName: clientFirst, lastName: clientLast, agencyId: "agency-a" },
    employee: { id: "staff-a", fullName: staffName, agencyId: "agency-a" },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe("ShiftsMonthCalendar shared-grid regression", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
    listShifts.mockReset();
    navigate.mockReset();
    vi.mocked(useNavigate).mockReturnValue(navigate);
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it("uses a calendar-grid skeleton while the entity shifts load", () => {
    listShifts.mockReturnValueOnce(new Promise(() => {}));

    render(<ShiftsMonthCalendar variant="client" agencyId="agency-a" clientId="client-a" />);

    expect(screen.getByLabelText("Loading this month's shifts")).toBeVisible();
    expect(screen.getAllByTestId("entity-calendar-skeleton-day")).toHaveLength(35);
    expect(screen.queryByText(/Loading this month/i)).not.toBeInTheDocument();
  });

  it("keeps client filtering, selectors, touch overflow, and agency detail navigation", async () => {
    listShifts.mockResolvedValue({
      success: true,
      count: 2,
      shifts: [
        entityShift("client-shift-1", "09:00AM", "Jamie Client", "Robin Staff"),
        entityShift("client-shift-2", "10:00AM", "Jamie Client", "Taylor Staff"),
      ],
    });

    render(<ShiftsMonthCalendar variant="client" agencyId="agency-a" clientId="client-a" />);

    expect(screen.getByRole("combobox", { name: "Month" })).toHaveTextContent("August");
    expect(screen.getByRole("combobox", { name: "Year" })).toHaveTextContent("2026");
    const firstShift = await screen.findByRole("button", { name: /Open shift details for Robin Staff/i });
    expect(firstShift).toHaveClass("cursor-pointer");

    const [params, options] = listShifts.mock.calls[0];
    expect(params).toEqual({
      agencyId: "agency-a",
      clientId: "client-a",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      limit: 200,
      client: true,
      employee: true,
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);

    const overflow = screen.getByRole("button", { name: "Show 1 more shift on August 12" });
    expect(overflow).toHaveClass("cursor-pointer");
    await userEvent.click(overflow);
    expect(await screen.findByRole("button", { name: /Open shift details for Taylor Staff/i })).toBeVisible();

    await userEvent.click(firstShift);
    expect(navigate).toHaveBeenCalledWith("/agency/shifts/client-shift-1");
  });

  it("keeps DSP filtering and presents the client as the primary calendar label", async () => {
    listShifts.mockResolvedValue({
      success: true,
      count: 1,
      shifts: [entityShift("dsp-shift-1", "09:00AM", "Morgan Client", "Robin Staff")],
    });

    render(<ShiftsMonthCalendar variant="dsp" agencyId="agency-a" employeeId="staff-a" />);

    const open = await screen.findByRole("button", { name: /Open shift details for Morgan Client/i });
    expect(open).toHaveAccessibleName(/Morgan Client.*Caregiver Robin Staff.*Status Pending.*Anomaly Missed shift/i);
    expect(listShifts.mock.calls[0][0]).toMatchObject({
      agencyId: "agency-a",
      employeeId: "staff-a",
    });
    expect(listShifts.mock.calls[0][0]).not.toHaveProperty("clientId");

    await userEvent.click(open);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/agency/shifts/dsp-shift-1"));
  });

  it("does not reuse a prior agency's cached month when the operational agency changes", async () => {
    const committedText: string[] = [];
    const calendar = (agencyId: string) => (
      <Profiler
        id="agency-calendar"
        onRender={() => committedText.push(document.body.textContent ?? "")}
      >
        <ShiftsMonthCalendar variant="client" agencyId={agencyId} clientId="shared-client" />
      </Profiler>
    );
    const beaconPage = deferred<{
      success: true;
      count: number;
      shifts: ReturnType<typeof entityShift>[];
    }>();
    listShifts
      .mockResolvedValueOnce({
        success: true,
        count: 1,
        shifts: [entityShift("atlas-shift", "09:00AM", "Atlas Client", "Atlas Staff")],
      })
      .mockReturnValueOnce(beaconPage.promise);

    const view = render(calendar("atlas"));
    expect(await screen.findByRole("button", { name: /Open shift details for Atlas Staff/i })).toBeVisible();

    committedText.length = 0;
    view.rerender(calendar("beacon"));

    expect(screen.queryByRole("button", { name: /Open shift details for Atlas Staff/i })).not.toBeInTheDocument();
    expect(committedText.some((text) => text.includes("Atlas Staff"))).toBe(false);
    beaconPage.resolve({
      success: true,
      count: 1,
      shifts: [entityShift("beacon-shift", "10:00AM", "Beacon Client", "Beacon Staff")],
    });
    expect(await screen.findByRole("button", { name: /Open shift details for Beacon Staff/i })).toBeVisible();
    expect(listShifts.mock.calls.map(([params]) => params.agencyId)).toEqual(["atlas", "beacon"]);
  });

  it("starts a fresh month cache after the calendar remounts in a new session", async () => {
    listShifts
      .mockResolvedValueOnce({
        success: true,
        count: 1,
        shifts: [entityShift("first-session", "09:00AM", "Session Client", "First Session Staff")],
      })
      .mockResolvedValueOnce({
        success: true,
        count: 1,
        shifts: [entityShift("second-session", "10:00AM", "Session Client", "Second Session Staff")],
      });

    const firstSession = render(
      <ShiftsMonthCalendar variant="client" agencyId="session-agency" clientId="session-client" />,
    );
    expect(await screen.findByRole("button", { name: /Open shift details for First Session Staff/i })).toBeVisible();
    firstSession.unmount();

    render(
      <ShiftsMonthCalendar variant="client" agencyId="session-agency" clientId="session-client" />,
    );

    expect(await screen.findByRole("button", { name: /Open shift details for Second Session Staff/i })).toBeVisible();
    expect(listShifts).toHaveBeenCalledTimes(2);
  });

  it("uses one keyboard-safe overflow menu on desktop and restores focus on Escape", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("hover: hover"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    listShifts.mockResolvedValue({
      success: true,
      count: 3,
      shifts: [
        entityShift("keyboard-shift-1", "09:00AM", "Jamie Client", "Robin Staff"),
        entityShift("keyboard-shift-2", "10:00AM", "Jamie Client", "Taylor Staff"),
        entityShift("keyboard-shift-3", "11:00AM", "Jamie Client", "Morgan Staff"),
      ],
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ShiftsMonthCalendar variant="client" agencyId="agency-a" clientId="client-keyboard" />);

    const overflow = await screen.findByRole("button", { name: "Show 2 more shifts on August 12" });
    overflow.focus();
    await user.keyboard("{Enter}");

    const firstChoice = await screen.findByRole("button", { name: /Open shift details for Taylor Staff/i });
    const secondChoice = await screen.findByRole("button", { name: /Open shift details for Morgan Staff/i });
    await waitFor(() => expect(firstChoice).toHaveFocus());
    await user.tab();
    expect(secondChoice).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(overflow).toHaveFocus();
  });
});
