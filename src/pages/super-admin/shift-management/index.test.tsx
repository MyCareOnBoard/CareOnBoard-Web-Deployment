import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({
  pathname: "/super-admin/shifts",
  search: "?agencyIds=&month=2026-08&view=calendar",
  navigate: vi.fn(),
}));
const listOperationalAgencies = vi.hoisted(() => vi.fn());
const listCalendarShifts = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: () => ({ pathname: routing.pathname, search: routing.search, hash: "", state: null, key: "test" }),
    useNavigate: () => routing.navigate,
  };
});
vi.mock("@/lib/api/super-admin-operations", () => ({ listOperationalAgencies }));
vi.mock("@/lib/api/shifts", () => ({ listCalendarShifts }));

import ShiftManagementWorkspace from "./index";

const atlas = { id: "atlas", name: "Atlas Care", status: "active", supportedClientTypes: ["ddd", "hha"], timezone: "America/New_York" };
const beacon = { id: "beacon", name: "Beacon Supports", status: "active", supportedClientTypes: ["ddd"], timezone: "America/New_York" };

describe("super-admin shift management workspace", () => {
  beforeEach(() => {
    routing.pathname = "/super-admin/shifts";
    routing.search = "?agencyIds=&month=2026-08&view=calendar";
    routing.navigate.mockReset();
    listOperationalAgencies.mockReset();
    listCalendarShifts.mockReset();
    listOperationalAgencies.mockResolvedValue({ data: [beacon, atlas], nextCursor: null, truncated: false, scanLimit: null });
    listCalendarShifts.mockResolvedValue({ month: "2026-08", shifts: [], nextCursor: null });
  });

  it("defaults to Calendar and preserves an explicit empty scope with zero shift requests", async () => {
    render(<ShiftManagementWorkspace />);

    expect(await screen.findByRole("heading", { name: "Shift management" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Calendar view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List view" })).toBeEnabled();
    expect(await screen.findByText("Choose one or more agencies to view shifts.")).toBeVisible();
    expect(listCalendarShifts).not.toHaveBeenCalled();
    const pageRequest = listOperationalAgencies.mock.calls.find(([, input]) => input?.limit === 50);
    expect(pageRequest?.[0]).toBe("shift-management");
    expect(pageRequest?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("opens the functional singular-agency List view", async () => {
    routing.search = "?agencyIds=atlas&month=2026-08&view=calendar&filter=open";
    render(<ShiftManagementWorkspace />);

    await userEvent.click(await screen.findByRole("button", { name: "List view" }));

    expect(routing.navigate).toHaveBeenCalledWith({
      pathname: "/super-admin/shifts/list",
      search: "?month=2026-08&view=list&filter=open&agencyId=atlas",
    });
  });

  it("opens a calendar card with singular agency scope and a safe return target", async () => {
    routing.search = "?agencyIds=atlas&month=2026-08&view=calendar&filter=open";
    listCalendarShifts.mockResolvedValue({
      month: "2026-08",
      shifts: [{
        id: "shift-9",
        date: "2026-08-05",
        startTime: "09:00",
        endTime: "12:00",
        status: "pending",
        clientId: "client-1",
        clientName: "Jamie Client",
        employeeId: "staff-1",
        staffName: "Robin Staff",
        serviceCode: "H2021",
        anomalyCodes: [],
      }],
      nextCursor: null,
    });
    render(<ShiftManagementWorkspace />);

    await userEvent.click(await screen.findByRole(
      "button",
      { name: /Open shift details for Jamie Client/i },
      { timeout: 5_000 },
    ));

    expect(routing.navigate).toHaveBeenCalledWith(
      `/super-admin/shifts/shift-9?agencyId=atlas&returnTo=${encodeURIComponent(
        "/super-admin/shifts?agencyIds=atlas&month=2026-08&view=calendar&filter=open",
      )}`,
    );
  });

  it("hydrates repeated URL agencies and renders their calendar without a global request", async () => {
    routing.search = "?agencyIds=atlas&agencyIds=beacon&month=2026-08&view=calendar&filter=open";
    listCalendarShifts.mockImplementation(async (params) => ({
      month: "2026-08",
      shifts: [{
        id: `${params.agencyId}-shift`,
        date: "2026-08-05",
        startTime: "09:00",
        endTime: "12:00",
        status: "pending",
        clientId: "client-1",
        clientName: "Jamie Client",
        employeeId: "staff-1",
        staffName: "Robin Staff",
        serviceCode: "H2021",
        anomalyCodes: [],
      }],
      nextCursor: null,
    }));

    render(<ShiftManagementWorkspace />);

    expect(await screen.findByText("2 shifts across 2 agencies.")).toBeVisible();
    const requestedAgencyIds = listCalendarShifts.mock.calls.map(([params]) => params.agencyId).sort();
    expect(requestedAgencyIds).toEqual(["atlas", "beacon"]);
    expect(listCalendarShifts.mock.calls.every(([params]) => typeof params.agencyId === "string" && !Array.isArray(params.agencyId))).toBe(true);
  });

  it("hydrates a URL-selected agency beyond the first scan page without duplicate selector requests", async () => {
    routing.search = "?agencyIds=target&month=2026-08&view=calendar";
    listOperationalAgencies.mockImplementation(async (_feature, input) => {
      if (input.ids) {
        return { data: [{ ...atlas, id: "target", name: "Target Care" }], nextCursor: null, truncated: false, scanLimit: null };
      }
      if (!input.cursor) return { data: [beacon], nextCursor: "page-2", truncated: false, scanLimit: null };
      return { data: [atlas], nextCursor: null, truncated: false, scanLimit: null };
    });

    render(<ShiftManagementWorkspace />);

    await waitFor(() => expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "target" }),
      expect.anything(),
    ));
    const hydrationCalls = listOperationalAgencies.mock.calls.filter(([, input]) => input.ids);
    const scanCalls = listOperationalAgencies.mock.calls.filter(([, input]) => !input.ids);
    expect(hydrationCalls).toHaveLength(1);
    expect(hydrationCalls[0][1].ids).toEqual(["target"]);
    expect(scanCalls).toHaveLength(2);
  });

  it("batches URL agency hydration at fifty IDs and reports truncated discovery", async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `agency-${index}`);
    routing.search = `?${ids.map((id) => `agencyIds=${id}`).join("&")}&month=2026-08&view=calendar`;
    listOperationalAgencies.mockImplementation(async (_feature, input) => ({
      data: input.ids ? input.ids.map((id: string) => ({ ...atlas, id, name: id })) : [],
      nextCursor: null,
      truncated: !input.ids,
      scanLimit: input.ids ? null : 200,
    }));

    render(<ShiftManagementWorkspace />);

    expect(await screen.findByText(/Agency discovery was limited to 200 records/i)).toBeVisible();
    const hydrationSizes = listOperationalAgencies.mock.calls
      .filter(([, input]) => input.ids)
      .map(([, input]) => input.ids.length);
    expect(hydrationSizes).toEqual([50, 50, 1]);
  });

  it("rejects a repeated allowed-agency cursor without issuing a third request", async () => {
    listOperationalAgencies
      .mockResolvedValueOnce({ data: [atlas], nextCursor: "repeat", truncated: false, scanLimit: null })
      .mockResolvedValueOnce({ data: [beacon], nextCursor: "repeat", truncated: false, scanLimit: null })
      .mockRejectedValueOnce(new Error("Runaway agency cursor request"));

    render(<ShiftManagementWorkspace />);

    expect(await screen.findByText("Repeated agency cursor.")).toBeVisible();
    expect(listOperationalAgencies).toHaveBeenCalledTimes(2);
  });

  it("keeps unrelated search state when clearing the selected agencies", async () => {
    routing.search = "?filter=open&clientType=hha&agencyIds=atlas&month=2026-08&view=calendar";
    render(<ShiftManagementWorkspace />);

    await userEvent.click(await screen.findByRole("button", { name: "Clear agencies" }));
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith({
      pathname: "/super-admin/shifts",
      search: "?filter=open&clientType=hha&month=2026-08&view=calendar&agencyIds=",
    }));
  });
});
