import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listShifts = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/shifts", () => ({ listShifts }));

import SuperAdminShiftsCalendar from "./SuperAdminShiftsCalendar";

const agency = { id: "atlas", name: "Atlas Care", status: "active", supportedClientTypes: ["ddd"] as const, timezone: "UTC" };

describe("SuperAdminShiftsCalendar", () => {
  beforeEach(() => {
    listShifts.mockReset();
    listShifts.mockResolvedValue({ success: true, count: 0, shifts: [] });
  });

  it("requests all authorized shifts when no agency is selected", async () => {
    render(<SuperAdminShiftsCalendar agencies={[]} dateRange={{ startDate: "2026-07-20", endDate: "2026-08-18" }} mode="ddd" onSelectionChange={vi.fn()} />);
    await waitFor(() => expect(listShifts).toHaveBeenCalledWith({
      startDate: "2026-07-20",
      endDate: "2026-08-18",
      client: true,
      employee: true,
      agency: true,
      clientType: "ddd",
      limit: 200,
    }, { signal: expect.any(AbortSignal) }));
  });

  it("uses a calendar-grid skeleton while shifts load", () => {
    listShifts.mockReturnValueOnce(new Promise(() => {}));

    render(<SuperAdminShiftsCalendar agencies={[]} dateRange={{ startDate: "2026-08-01", endDate: "2026-08-30" }} mode="ddd" onSelectionChange={vi.fn()} />);

    expect(screen.getByLabelText("Loading shift calendar")).toBeVisible();
    expect(screen.getAllByTestId("shift-calendar-skeleton-day")).toHaveLength(35);
    expect(screen.queryByText(/Loading…/i)).not.toBeInTheDocument();
  });

  it("uses the common shifts endpoint inputs for each agency", async () => {
    render(<SuperAdminShiftsCalendar agencies={[agency]} dateRange={{ startDate: "2026-07-20", endDate: "2026-08-18" }} mode="ddd" onSelectionChange={vi.fn()} />);
    await waitFor(() => expect(listShifts).toHaveBeenCalledWith({
      agencyId: "atlas",
      startDate: "2026-07-20",
      endDate: "2026-08-18",
      client: true,
      employee: true,
      agency: true,
      clientType: "ddd",
      limit: 200,
    }, { signal: expect.any(AbortSignal) }));
  });

  it("shows one month at a time and navigates within the selected range", async () => {
    render(<SuperAdminShiftsCalendar agencies={[]} dateRange={{ startDate: "2026-07-20", endDate: "2026-08-18" }} mode="ddd" onSelectionChange={vi.fn()} />);
    expect(await screen.findByRole("grid", { name: "Shifts for July 2026" })).toBeVisible();
    expect(screen.getAllByRole("grid")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Previous calendar month" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next calendar month" }));

    expect(screen.getByRole("grid", { name: "Shifts for August 2026" })).toBeVisible();
    expect(screen.getAllByRole("grid")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Next calendar month" })).toBeDisabled();
  });

  it("follows pagination cursors from the common endpoint", async () => {
    listShifts
      .mockResolvedValueOnce({ success: true, count: 0, shifts: [], nextCursor: "shift-200" })
      .mockResolvedValueOnce({ success: true, count: 0, shifts: [], nextCursor: null });
    render(<SuperAdminShiftsCalendar agencies={[]} dateRange={{ startDate: "2026-08-01", endDate: "2026-08-30" }} mode="ddd" onSelectionChange={vi.fn()} />);
    await waitFor(() => expect(listShifts).toHaveBeenCalledTimes(2));
    expect(listShifts).toHaveBeenNthCalledWith(2, expect.objectContaining({
      agency: true,
      startAfter: "shift-200",
    }), expect.anything());
  });

  it("normalizes populated client and employee names from /shifts", async () => {
    listShifts.mockResolvedValue({
      success: true,
      count: 1,
      shifts: [{
        id: "shift-1", date: "2026-08-03", startTime: "09:00", endTime: "12:00", status: "pending",
        agencyId: "atlas", clientId: "client-1", employeeId: "staff-1",
        client: { id: "client-1", fullName: "Jamie Client" },
        employee: { id: "staff-1", fullName: "Robin Staff" },
        anomalyCodes: ["missed"],
      }],
    });
    render(<SuperAdminShiftsCalendar agencies={[agency]} dateRange={{ startDate: "2026-08-01", endDate: "2026-08-30" }} mode="ddd" onSelectionChange={vi.fn()} />);
    expect(await screen.findByText("Jamie Client")).toBeVisible();
    expect(screen.getByText("Robin Staff")).toBeVisible();
    expect(screen.getByTitle("Missed shift")).toBeVisible();
  });

  it("applies the shared anomaly category after loading all common-endpoint pages", async () => {
    listShifts.mockResolvedValue({
      success: true,
      count: 2,
      shifts: [
        {
          id: "missed", date: "2026-08-03", status: "pending", agencyId: "atlas",
          client: { id: "client-1", fullName: "Missed Client" }, anomalyCodes: ["missed"],
        },
        {
          id: "other", date: "2026-08-04", status: "pending", agencyId: "atlas",
          client: { id: "client-2", fullName: "Other Client" }, anomalyCodes: ["unassigned"],
        },
      ],
    });
    render(
      <SuperAdminShiftsCalendar
        agencies={[agency]}
        dateRange={{ startDate: "2026-08-01", endDate: "2026-08-30" }}
        mode="ddd"
        category="missed_expired"
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Missed Client")).toBeVisible();
    expect(screen.queryByText("Other Client")).not.toBeInTheDocument();
  });
});
