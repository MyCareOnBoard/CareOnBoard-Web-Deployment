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

    await userEvent.click(screen.getByRole("button", { name: "Show 1 more shift on August 12" }));
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
    expect(listShifts.mock.calls[0][0]).toMatchObject({
      agencyId: "agency-a",
      employeeId: "staff-a",
    });
    expect(listShifts.mock.calls[0][0]).not.toHaveProperty("clientId");

    await userEvent.click(open);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/agency/shifts/dsp-shift-1"));
  });

  it("opens desktop hover overflow from the keyboard and moves focus into its choices", async () => {
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
      count: 2,
      shifts: [
        entityShift("keyboard-shift-1", "09:00AM", "Jamie Client", "Robin Staff"),
        entityShift("keyboard-shift-2", "10:00AM", "Jamie Client", "Taylor Staff"),
      ],
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ShiftsMonthCalendar variant="client" agencyId="agency-a" clientId="client-keyboard" />);

    const overflow = await screen.findByRole("button", { name: "Show 1 more shift on August 12" });
    overflow.focus();
    await user.keyboard("{Enter}");

    const choice = await screen.findByRole("button", { name: /Open shift details for Taylor Staff/i });
    await waitFor(() => expect(choice).toHaveFocus());
  });
});
