import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({ pathname: "/super-admin/shifts", search: "", navigate: vi.fn() }));
const useListAllAgenciesQuery = vi.hoisted(() => vi.fn());
const listShifts = vi.hoisted(() => vi.fn());
const listOperationalAgencies = vi.hoisted(() => vi.fn(() => new Promise(() => undefined)));
const auth = vi.hoisted(() => ({ accessList: ["Shift Management", "Shift Maintenance"] as string[] }));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLocation: () => ({ ...routing, hash: "", state: null, key: "test" }),
    useNavigate: () => routing.navigate,
  };
});
vi.mock("@/pages/super-admin/agencies/api", () => ({
  useListAllAgenciesQuery,
  superAdminApi: {
    reducerPath: "testSuperAdminApi",
    reducer: (state = {}) => state,
    middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
  },
}));
vi.mock("@/lib/api/super-admin-operations", () => ({ listOperationalAgencies }));
vi.mock("@/lib/api/shifts", () => ({ listShifts }));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { profile: { accessList: auth.accessList } } }),
}));

import ShiftManagementWorkspace from "./index";

const atlas = { id: "atlas", name: "Atlas Care", status: "active", supportedClientTypes: ["ddd", "hha"], timezone: "UTC" };

describe("super-admin shift management workspace", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 1, 12));
    routing.pathname = "/super-admin/shifts";
    routing.search = "";
    routing.navigate.mockReset();
    auth.accessList = ["Shift Management", "Shift Maintenance"];
    listShifts.mockReset();
    listShifts.mockResolvedValue({ success: true, count: 0, shifts: [] });
    listOperationalAgencies.mockClear();
    useListAllAgenciesQuery.mockReset();
    useListAllAgenciesQuery.mockReturnValue({
      data: { success: true, count: 1, total: 1, page: 1, totalPages: 1, agencies: [atlas] },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => vi.useRealTimers());

  it("uses a layout-matched workspace skeleton while agencies load", () => {
    useListAllAgenciesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ShiftManagementWorkspace />);

    expect(screen.getByLabelText("Loading shift workspace")).toBeVisible();
    expect(screen.getAllByTestId("shift-workspace-skeleton-card")).toHaveLength(5);
    expect(screen.queryByText(/Loading shift workspace/i)).not.toBeInTheDocument();
  });

  it("uses metric skeletons while shift statistics load", () => {
    listShifts.mockReturnValue(new Promise(() => {}));

    render(<ShiftManagementWorkspace />);

    expect(screen.getByLabelText("Loading shift statistics")).toBeVisible();
    expect(screen.getAllByTestId("shift-stat-skeleton-value")).toHaveLength(6);
  });

  it("loads all authorized shifts without auto-selecting the first agency", async () => {
    render(<ShiftManagementWorkspace />);
    await waitFor(() => expect(listShifts).toHaveBeenCalledWith(
      expect.not.objectContaining({ agencyId: expect.anything() }),
      expect.anything(),
    ));
    expect(useListAllAgenciesQuery).toHaveBeenCalledWith({
      status: "active",
      features: "id,name,status,supportedClientTypes,timezone",
    }, { skip: false });
    expect(screen.getByRole("button", { name: "Change shift date range, Jul 3, 2026 - Aug 1, 2026" })).toBeVisible();
  });

  it("loads an explicitly selected agency through common /shifts for the URL date range", async () => {
    routing.search = "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=calendar";
    render(<ShiftManagementWorkspace />);
    await waitFor(() => expect(listShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "atlas", startDate: "2026-07-20", endDate: "2026-08-18" }),
      expect.anything(),
    ));
  });

  it("preserves the date range when changing to List", async () => {
    routing.search = "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=calendar&filter=open";
    render(<ShiftManagementWorkspace />);
    await userEvent.click(await screen.findByRole("button", { name: "List view" }));
    expect(routing.navigate).toHaveBeenCalledWith({
      pathname: "/super-admin/shifts/list",
      search: "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=list&filter=open",
    });
  });

  it("uses one Shifts tab and keeps the Calendar/List toggle beside the tabs", async () => {
    render(<ShiftManagementWorkspace />);

    await waitFor(() => expect(screen.queryByLabelText("Loading shift statistics")).not.toBeInTheDocument());

    const sections = screen.getByRole("navigation", { name: "Shift workspace sections" });
    expect(screen.getByRole("button", { name: "Shifts" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Shift list" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Calendar$/ })).not.toBeInTheDocument();
    expect(sections).toContainElement(screen.getByRole("group", { name: "Shift workspace view" }));
    expect(screen.getAllByRole("button", { name: "Calendar view" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "List view" })).toHaveLength(1);
    const filterButton = screen.getByRole("button", { name: "Filter shifts, All shifts" });
    expect(filterButton.compareDocumentPosition(screen.getByRole("group", { name: "Shift workspace view" })))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByRole("button", { name: "Maintenance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approvals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activity logs" })).not.toBeInTheDocument();
  });

  it("stores dropdown and overview-card filters in the workspace URL", async () => {
    routing.search = "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=calendar";
    render(<ShiftManagementWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "Filter shifts, All shifts" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Missed / expired" }));
    expect(routing.navigate).toHaveBeenLastCalledWith({
      pathname: "/super-admin/shifts",
      search: "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=calendar&shiftCategory=missed_expired",
    });

    routing.navigate.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Filter shifts by Scheduled" }));
    expect(routing.navigate).toHaveBeenLastCalledWith({
      pathname: "/super-admin/shifts",
      search: "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=calendar&shiftCategory=scheduled",
    });
  });

  it("clears an active overview-card filter when clicked again", async () => {
    routing.search = "?startDate=2026-07-20&endDate=2026-08-18&view=calendar&shiftCategory=scheduled";
    render(<ShiftManagementWorkspace />);

    const scheduled = screen.getByRole("button", { name: "Filter shifts by Scheduled" });
    expect(scheduled).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(scheduled);
    expect(routing.navigate).toHaveBeenLastCalledWith({
      pathname: "/super-admin/shifts",
      search: "?startDate=2026-07-20&endDate=2026-08-18&view=calendar",
    });
  });

  it("does not link attention shifts while the maintenance section is hidden", async () => {
    routing.search = "?agencyId=atlas&startDate=2026-07-20&endDate=2026-08-18&view=calendar";
    render(<ShiftManagementWorkspace />);

    expect(await screen.findByRole("heading", { name: "Needs attention" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Needs attention/i })).not.toBeInTheDocument();
  });

  it("renders maintenance-only navigation without loading shift-management data", async () => {
    auth.accessList = ["Shift Maintenance"];
    routing.pathname = "/super-admin/shifts/maintenance";
    useListAllAgenciesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ShiftManagementWorkspace />);

    await act(async () => { await vi.advanceTimersByTimeAsync(350); });

    expect(useListAllAgenciesQuery).toHaveBeenCalledWith({
      status: "active",
      features: "id,name,status,supportedClientTypes,timezone",
    }, { skip: true });
    expect(listShifts).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Shift Maintenance" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Shift statistics" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select an agency/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Change shift date range/i })).toBeVisible();
    await waitFor(() => expect(listOperationalAgencies).toHaveBeenCalledWith(
      "shift-maintenance",
      expect.objectContaining({ limit: 50 }),
    ));
    expect(screen.queryByRole("button", { name: "Maintenance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shifts" })).not.toBeInTheDocument();
  });

  it("keeps shift statistics on maintenance when Shift Management access is available", async () => {
    routing.pathname = "/super-admin/shifts/maintenance";

    render(<ShiftManagementWorkspace />);

    expect(screen.getByRole("heading", { name: "Shift Maintenance" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Shift statistics" })).toBeVisible();
    await waitFor(() => expect(listShifts).toHaveBeenCalled());
  });

  it("does not link maintenance tools without Shift Maintenance access", async () => {
    auth.accessList = ["Shift Management"];
    render(<ShiftManagementWorkspace />);

    await waitFor(() => expect(screen.queryByLabelText("Loading shift statistics")).not.toBeInTheDocument());

    expect(screen.queryByRole("link", { name: /Needs attention/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  });
});
