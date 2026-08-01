import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({
  pathname: "/super-admin/shifts",
  search: "?agencyIds=&month=2026-08&view=calendar",
  navigate: vi.fn(),
}));
const listOperationalAgencies = vi.hoisted(() => vi.fn());
const getOperationalAgencyContext = vi.hoisted(() => vi.fn());
const listCalendarShifts = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: () => ({ pathname: routing.pathname, search: routing.search, hash: "", state: null, key: "test" }),
    useNavigate: () => routing.navigate,
  };
});
vi.mock("@/lib/api/super-admin-operations", () => ({
  listOperationalAgencies,
  getOperationalAgencyContext,
}));
vi.mock("@/lib/api/shifts", () => ({ listCalendarShifts }));

import ShiftManagementWorkspace from "./index";

const atlas = { id: "atlas", name: "Atlas Care", status: "active", supportedClientTypes: ["ddd", "hha"], timezone: "America/New_York" };
const beacon = { id: "beacon", name: "Beacon Supports", status: "active", supportedClientTypes: ["ddd"], timezone: "America/New_York" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("super-admin shift management workspace", () => {
  beforeEach(() => {
    routing.pathname = "/super-admin/shifts";
    routing.search = "?agencyIds=&month=2026-08&view=calendar";
    routing.navigate.mockReset();
    listOperationalAgencies.mockReset();
    getOperationalAgencyContext.mockReset();
    listCalendarShifts.mockReset();
    listOperationalAgencies.mockResolvedValue({ data: [beacon, atlas], nextCursor: null, truncated: false, scanLimit: null });
    getOperationalAgencyContext.mockImplementation(async (_feature, agencyId) => {
      if (agencyId === atlas.id) return atlas;
      if (agencyId === beacon.id) return beacon;
      return { ...atlas, id: agencyId, name: `${agencyId} Care` };
    });
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
      if (!input.cursor) return { data: [beacon], nextCursor: "page-2", truncated: false, scanLimit: null };
      return { data: [atlas], nextCursor: null, truncated: false, scanLimit: null };
    });
    getOperationalAgencyContext.mockResolvedValue({ ...atlas, id: "target", name: "Target Care" });

    render(<ShiftManagementWorkspace />);

    await waitFor(() => expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "target" }),
      expect.anything(),
    ));
    expect(getOperationalAgencyContext).toHaveBeenCalledTimes(1);
    expect(getOperationalAgencyContext).toHaveBeenCalledWith(
      "shift-management",
      "target",
      expect.any(AbortSignal),
    );
    const scanCalls = listOperationalAgencies.mock.calls;
    expect(scanCalls).toHaveLength(2);
  });

  it("revalidates every URL agency through operational context and reports truncated discovery", async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `agency-${index}`);
    routing.search = `?${ids.map((id) => `agencyIds=${id}`).join("&")}&month=2026-08&view=calendar`;
    listOperationalAgencies.mockResolvedValue({
      data: [],
      nextCursor: null,
      truncated: true,
      scanLimit: 200,
    });
    let activeRequests = 0;
    let peakRequests = 0;
    getOperationalAgencyContext.mockImplementation(async (_feature, id) => {
      activeRequests += 1;
      peakRequests = Math.max(peakRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return { ...atlas, id, name: id };
    });

    render(<ShiftManagementWorkspace />);

    expect(await screen.findByText(/Agency discovery was limited to 200 records/i)).toBeVisible();
    expect(getOperationalAgencyContext).toHaveBeenCalledTimes(101);
    expect(getOperationalAgencyContext.mock.calls.map(([, id]) => id)).toEqual(ids);
    expect(peakRequests).toBe(4);
  });

  it("does not reload agency discovery or contexts for month and filter-only URL changes", async () => {
    routing.search = "?agencyIds=atlas&month=2026-08&view=calendar&filter=open";
    const view = render(<ShiftManagementWorkspace />);
    await waitFor(() => expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "atlas", month: "2026-08" }),
      expect.anything(),
    ));
    getOperationalAgencyContext.mockClear();
    listOperationalAgencies.mockClear();
    listCalendarShifts.mockClear();

    routing.search = "?agencyIds=atlas&month=2026-09&view=calendar&filter=closed";
    view.rerender(<ShiftManagementWorkspace />);

    await waitFor(() => expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "atlas", month: "2026-09" }),
      expect.anything(),
    ));
    expect(getOperationalAgencyContext).not.toHaveBeenCalled();
    expect(listOperationalAgencies).not.toHaveBeenCalled();
  });

  it("merges an agency selected from search after truncated discovery before resolving the workspace", async () => {
    const target = { ...atlas, id: "target", name: "Target Care" };
    routing.search = "?agencyIds=&month=2026-08&view=calendar";
    listOperationalAgencies.mockImplementation(async (_feature, input) => input.search
      ? { data: [target], nextCursor: null, truncated: false, scanLimit: null }
      : { data: [beacon], nextCursor: null, truncated: true, scanLimit: 200 });
    getOperationalAgencyContext.mockResolvedValue(target);
    listCalendarShifts.mockImplementation(async (params) => ({
      month: "2026-08",
      shifts: [{
        id: `${params.agencyId}-shift`,
        date: "2026-08-05",
        startTime: "09:00",
        endTime: "12:00",
        status: "pending",
        clientId: "client-1",
        clientName: "Target Client",
        employeeId: "staff-1",
        staffName: "Target Staff",
        serviceCode: "H2021",
        anomalyCodes: [],
      }],
      nextCursor: null,
    }));

    const view = render(<ShiftManagementWorkspace />);
    await userEvent.click(await screen.findByRole("button", { name: /Select agencies/i }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search agencies" }), "Target");
    await userEvent.click(await screen.findByRole("option", { name: /Target Care/i }, { timeout: 2_000 }));

    const selectionNavigation = routing.navigate.mock.calls.at(-1)?.[0];
    expect(selectionNavigation).toEqual({
      pathname: "/super-admin/shifts",
      search: "?month=2026-08&view=calendar&agencyIds=target",
    });
    routing.search = selectionNavigation.search;
    view.rerender(<ShiftManagementWorkspace />);

    expect(await screen.findByLabelText("Selected operational agency")).toHaveTextContent("Operating in Target Care");
    expect(await screen.findByText("Target Client")).toBeVisible();
    expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "target" }),
      expect.anything(),
    );
    expect(listCalendarShifts.mock.calls.some(([params]) => params.agencyId === "beacon")).toBe(false);
  });

  it("hydrates a direct URL agency change before issuing calendar reads", async () => {
    const target = { ...atlas, id: "target", name: "Target Care" };
    routing.search = "?agencyIds=atlas&month=2026-08&view=calendar";
    getOperationalAgencyContext.mockImplementation(async (_feature, id) => id === "target" ? target : atlas);
    const view = render(<ShiftManagementWorkspace />);
    await waitFor(() => expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "atlas" }),
      expect.anything(),
    ));

    listCalendarShifts.mockClear();
    routing.search = "?agencyIds=target&month=2026-08&view=calendar";
    view.rerender(<ShiftManagementWorkspace />);

    await waitFor(() => expect(listCalendarShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "target" }),
      expect.anything(),
    ));
    expect(listCalendarShifts.mock.calls.some(([params]) => params.agencyId !== "target")).toBe(false);
  });

  it("fails closed for a denied or unknown requested agency instead of selecting a fallback", async () => {
    routing.search = "?agencyIds=unknown&month=2026-08&view=calendar";
    listOperationalAgencies.mockResolvedValue({ data: [atlas], nextCursor: null, truncated: false, scanLimit: null });
    getOperationalAgencyContext.mockRejectedValue(new Error("Requested agency is not available."));

    render(<ShiftManagementWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Requested agency is not available.");
    expect(listCalendarShifts).not.toHaveBeenCalled();
  });

  it("aborts sibling agency work and starts no follow-up requests after one context failure", async () => {
    const ids = Array.from({ length: 8 }, (_, index) => `agency-${index}`);
    routing.search = `?${ids.map((id) => `agencyIds=${id}`).join("&")}&month=2026-08&view=calendar`;
    const failedContext = deferred<typeof atlas>();
    const releaseSiblingContexts = deferred<void>();
    const firstDiscoveryPage = deferred<{
      data: typeof atlas[];
      nextCursor: string;
      truncated: boolean;
      scanLimit: null;
    }>();
    getOperationalAgencyContext.mockImplementation(async (_feature, id) => {
      if (id === ids[0]) return failedContext.promise;
      await releaseSiblingContexts.promise;
      return { ...atlas, id, name: id };
    });
    listOperationalAgencies
      .mockReturnValueOnce(firstDiscoveryPage.promise)
      .mockRejectedValue(new Error("Unexpected follow-up agency discovery request"));

    render(<ShiftManagementWorkspace />);

    await waitFor(() => expect(getOperationalAgencyContext).toHaveBeenCalledTimes(4));
    expect(listOperationalAgencies).toHaveBeenCalledTimes(1);

    await act(async () => {
      failedContext.reject(new Error("Requested agency is not available."));
      await Promise.resolve();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Requested agency is not available.");

    const contextSignals = getOperationalAgencyContext.mock.calls.map(([, , signal]) => signal as AbortSignal);
    expect(contextSignals.every((signal) => signal.aborted)).toBe(true);
    expect(listOperationalAgencies.mock.calls[0][1].signal.aborted).toBe(true);

    await act(async () => {
      releaseSiblingContexts.resolve(undefined);
      firstDiscoveryPage.resolve({
        data: [],
        nextCursor: "page-2",
        truncated: false,
        scanLimit: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getOperationalAgencyContext).toHaveBeenCalledTimes(4);
    expect(listOperationalAgencies).toHaveBeenCalledTimes(1);
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
