import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";
import type {
  OperationalActor,
  OperationalAgencyDataAdapter,
  OperationalAgencySummary,
} from "@/lib/operational-agency/types";
import SchedulingPage from "@/pages/agency/scheduling";
import AgencyShiftDetailsPage from "@/pages/agency/shift-details";
import ShiftsListPage from "@/pages/agency/scheduling/shifts";
import ApprovalsPage from "@/pages/agency/scheduling/approvals";
import ActivityLogsPage from "@/pages/agency/scheduling/activity-logs";

const api = vi.hoisted(() => ({
  listShifts: vi.fn(),
  getShiftById: vi.fn(),
  fetchShiftMaintenanceAudit: vi.fn(),
  deleteShift: vi.fn(),
  updateShift: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
}));

const toast = vi.hoisted(() => vi.fn());
const modalCapture = vi.hoisted(() => ({ addScheduleProps: null as null | Record<string, unknown> }));

vi.mock("react-router", async () => {
  return vi.importActual<typeof import("react-router")>("react-router");
});

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: auth.user }),
}));

vi.mock("react-redux", async () => {
  const actual = await vi.importActual<typeof import("react-redux")>("react-redux");
  return {
    ...actual,
    useSelector: () => "ddd",
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("@/lib/axios", () => ({
  default: {},
}));

vi.mock("react-loader-spinner", () => ({
  Oval: () => null,
}));

vi.mock("@/pages/agency/scheduling/components/AddScheduleModal", () => ({
  default: (props: Record<string, unknown>) => {
    modalCapture.addScheduleProps = props;
    return props.isOpen ? <div role="dialog" aria-label="Schedule editor" /> : null;
  },
}));

vi.mock("@/components/ShiftDetailsModal", () => ({
  default: () => null,
}));

vi.mock("@/lib/api/shifts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/shifts")>("@/lib/api/shifts");
  return {
    ...actual,
    listShifts: api.listShifts,
    getShiftById: api.getShiftById,
    fetchShiftMaintenanceAudit: api.fetchShiftMaintenanceAudit,
    deleteShift: api.deleteShift,
    updateShift: api.updateShift,
  };
});

let RealShiftDetailsModal: typeof import("@/components/ShiftDetailsModal")["default"];

beforeAll(async () => {
  const shiftDetailsModule = await vi.importActual<
    typeof import("@/components/ShiftDetailsModal")
  >("@/components/ShiftDetailsModal");
  RealShiftDetailsModal = shiftDetailsModule.default;
});

const data: OperationalAgencyDataAdapter = {
  searchClients: async () => ({ items: [], truncated: false, scanLimit: null }),
  searchStaff: async () => ({ items: [], truncated: false, scanLimit: null }),
  listServices: async () => ({ items: [], truncated: false, scanLimit: null }),
};

const agency = (id: string, name: string): OperationalAgencySummary => ({
  id,
  name,
  status: "active",
  supportedClientTypes: ["ddd"],
  timezone: "America/New_York",
});

function renderScheduling(actor: OperationalActor, selectedAgency: OperationalAgencySummary) {
  return render(
    <MemoryRouter initialEntries={[actor === "agency" ? "/agency/shifts" : "/super-admin/shifts/list"]}>
      <OperationalAgencyProvider
        actor={actor}
        agencyId={selectedAgency.id}
        agency={selectedAgency}
        mode="ddd"
        capabilities={{
          canManageShifts: true,
          canManageBilling: false,
          shiftMaintenance: actor === "agency",
        } as never}
        data={data}
      >
        <SchedulingPage />
        <LocationProbe />
      </OperationalAgencyProvider>
    </MemoryRouter>,
  );
}

function renderDetails(
  actor: OperationalActor,
  selectedAgency: OperationalAgencySummary,
  initialEntry: string,
  shiftMaintenance: boolean,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path={actor === "agency" ? "/agency/shifts/:shiftId" : "/super-admin/shifts/:shiftId"}
          element={(
            <OperationalAgencyProvider
              actor={actor}
              agencyId={selectedAgency.id}
              agency={selectedAgency}
              mode="ddd"
              capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance } as never}
              data={data}
            >
              <AgencyShiftDetailsPage />
              <LocationProbe />
            </OperationalAgencyProvider>
          )}
        />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderOperationalPage(Page: React.ComponentType, shiftMaintenance = false) {
  const selectedAgency = agency("agency-b", "Beacon Supports");
  return render(
    <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=agency-b"]}>
      <OperationalAgencyProvider
        actor="super_admin"
        agencyId={selectedAgency.id}
        agency={selectedAgency}
        mode="ddd"
        capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance }}
        data={data}
      >
        <Page />
        <LocationProbe />
      </OperationalAgencyProvider>
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{`${location.pathname}${location.search}`}</output>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function shift(id: string, agencyId: string, firstName: string) {
  return {
    id,
    agencyId,
    date: "2026-07-28",
    startTime: "09:00:AM",
    endTime: "11:00:AM",
    status: "available",
    type: "automatic",
    submissionStatus: "submitted",
    location: "1 Main Street",
    client: { id: `${id}-client`, firstName, lastName: "Client" },
    employee: { id: `${id}-staff`, fullName: "Robin Staff", role: "dsp" },
  };
}

describe("shared operational shift pages", () => {
  beforeEach(() => {
    toast.mockReset();
    modalCapture.addScheduleProps = null;
    api.listShifts.mockReset();
    api.listShifts.mockResolvedValue({ success: true, shifts: [] });
    api.getShiftById.mockReset();
    api.getShiftById.mockResolvedValue({ success: true, shift: shift("shift-1", "agency-a", "Jamie") });
    api.fetchShiftMaintenanceAudit.mockReset();
    api.fetchShiftMaintenanceAudit.mockResolvedValue({ audits: [], nextCursor: null, hasNextPage: false });
    api.deleteShift.mockReset();
    api.deleteShift.mockResolvedValue({ success: true, message: "Deleted" });
    api.updateShift.mockReset();
    api.updateShift.mockResolvedValue({ success: true, shift: shift("shift-1", "agency-a", "Jamie") });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the same scheduling domain request from agency and super-admin contexts", async () => {
    auth.user = {
      uid: "agency-user",
      userType: "agency",
      agencyId: "agency-a",
      agency: { id: "agency-a", name: "Atlas Care", supportedClientTypes: ["ddd"] },
    };
    renderScheduling("agency", agency("agency-a", "Atlas Care"));

    expect(await screen.findByRole("heading", { name: "Shift Management" })).toBeVisible();
    await waitFor(() => expect(api.listShifts).toHaveBeenCalledTimes(1));
    const agencyRequest = api.listShifts.mock.calls[0][0];

    cleanup();
    api.listShifts.mockClear();
    auth.user = {
      uid: "super-user",
      userType: "super_admin",
      profile: { accessList: ["Shift Management"] },
    };
    renderScheduling("super_admin", agency("agency-b", "Beacon Supports"));

    expect(await screen.findByRole("heading", { name: "Shift Management" })).toBeVisible();
    await waitFor(() => expect(api.listShifts).toHaveBeenCalledTimes(1));
    expect(api.listShifts.mock.calls[0][0]).toEqual({
      ...agencyRequest,
      agencyId: "agency-b",
    });
  });

  it("uses the operational maintenance route only when that capability is present", async () => {
    auth.user = { uid: "agency-user", userType: "agency", agencyId: "agency-a" };
    renderScheduling("agency", agency("agency-a", "Atlas Care"));

    expect(await screen.findByText("No shifts yet. Add a schedule to get started.")).toBeVisible();
    await userEvent.click(await screen.findByRole("button", {
      name: "Open shift maintenance: review problem shifts and activity history",
    }));
    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent(
      "/agency/shifts/maintenance",
    );

    cleanup();
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };
    renderScheduling("super_admin", agency("agency-b", "Beacon Supports"));
    expect(await screen.findByText("No shifts yet. Add a schedule to get started.")).toBeVisible();
    expect(screen.queryByRole("button", {
      name: "Open shift maintenance: review problem shifts and activity history",
    })).not.toBeInTheDocument();
  });

  it("discards late list responses when the operational agency changes", async () => {
    const atlasResponse = deferred<{ success: true; shifts: ReturnType<typeof shift>[] }>();
    const beaconResponse = deferred<{ success: true; shifts: ReturnType<typeof shift>[] }>();
    api.listShifts
      .mockReturnValueOnce(atlasResponse.promise)
      .mockReturnValueOnce(beaconResponse.promise);
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };

    const view = renderScheduling("super_admin", agency("agency-a", "Atlas Care"));
    await waitFor(() => expect(api.listShifts).toHaveBeenCalledTimes(1));
    view.rerender(
      <MemoryRouter initialEntries={["/super-admin/shifts/list"]}>
        <OperationalAgencyProvider
          actor="super_admin"
          agencyId="agency-b"
          agency={agency("agency-b", "Beacon Supports")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false } as never}
          data={data}
        >
          <SchedulingPage />
          <LocationProbe />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.listShifts).toHaveBeenCalledTimes(2));

    await act(async () => {
      beaconResponse.resolve({ success: true, shifts: [shift("beacon-shift", "agency-b", "Beacon")] });
    });
    expect(await screen.findByText("Beacon Client")).toBeVisible();

    await act(async () => {
      atlasResponse.resolve({ success: true, shifts: [shift("atlas-shift", "agency-a", "Atlas")] });
    });
    expect(screen.queryByText("Atlas Client")).not.toBeInTheDocument();
    expect(screen.getByText("Beacon Client")).toBeVisible();
  });

  it("clears an open destructive selection when the operational agency changes", async () => {
    api.listShifts
      .mockResolvedValueOnce({ success: true, shifts: [shift("atlas-shift", "agency-a", "Atlas")] })
      .mockResolvedValueOnce({ success: true, shifts: [shift("beacon-shift", "agency-b", "Beacon")] });
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };

    const view = renderScheduling("super_admin", agency("agency-a", "Atlas Care"));
    await userEvent.click(await screen.findByRole("button", { name: "Shift actions for Atlas Client" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete this shift from the schedule" }));
    await waitFor(() => expect(
      screen.getByRole("heading", { name: "Delete this shift?" }),
    ).toBeVisible());

    view.rerender(
      <MemoryRouter initialEntries={["/super-admin/shifts/list"]}>
        <OperationalAgencyProvider
          actor="super_admin"
          agencyId="agency-b"
          agency={agency("agency-b", "Beacon Supports")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false } as never}
          data={data}
        >
          <SchedulingPage />
          <LocationProbe />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Delete this shift?" })).not.toBeInTheDocument());
    expect(await screen.findByText("Beacon Client")).toBeVisible();
  });

  it("ignores a completed schedule deletion after the operational agency changes", async () => {
    const deletion = deferred<{ success: true; message: string }>();
    api.deleteShift.mockReturnValueOnce(deletion.promise);
    api.listShifts
      .mockResolvedValueOnce({ success: true, shifts: [shift("shared-shift", "agency-a", "Atlas")] })
      .mockResolvedValueOnce({ success: true, shifts: [shift("shared-shift", "agency-b", "Beacon")] });
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };

    const view = render(
      <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=agency-a"]}>
        <OperationalAgencyProvider
          key="agency-a"
          actor="super_admin"
          agencyId="agency-a"
          agency={agency("agency-a", "Atlas Care")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false } as never}
          data={data}
        >
          <SchedulingPage />
          <LocationProbe />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Shift actions for Atlas Client" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete this shift from the schedule" }));
    const confirmDelete = screen.getByRole("button", { name: "Delete shift" });
    await waitFor(() => expect(confirmDelete).toBeEnabled());
    await userEvent.click(confirmDelete);
    await waitFor(() => expect(api.deleteShift).toHaveBeenCalledWith(
      "shared-shift",
      { agencyId: "agency-a" },
    ));

    toast.mockClear();
    view.rerender(
      <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=agency-b"]}>
        <OperationalAgencyProvider
          key="agency-b"
          actor="super_admin"
          agencyId="agency-b"
          agency={agency("agency-b", "Beacon Supports")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false } as never}
          data={data}
        >
          <SchedulingPage />
          <LocationProbe />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Beacon Client")).toBeVisible();

    await act(async () => {
      deletion.resolve({ success: true, message: "Deleted" });
    });

    expect(screen.getByText("Beacon Client")).toBeVisible();
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Shift deleted" }));
  });

  it("loads shift details with the provider agency and gates maintenance reads", async () => {
    auth.user = { uid: "agency-user", userType: "agency", agencyId: "agency-a" };
    renderDetails("agency", agency("agency-a", "Atlas Care"), "/agency/shifts/shift-1", true);

    expect(await screen.findByRole("heading", { name: "Shift details" })).toBeVisible();
    await waitFor(() => expect(api.getShiftById).toHaveBeenCalledWith(
      "shift-1",
      expect.objectContaining({ agencyId: "agency-a", client: true, employee: true }),
    ));
    expect(api.fetchShiftMaintenanceAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-a",
        shiftId: "shift-1",
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    cleanup();
    api.getShiftById.mockClear();
    api.fetchShiftMaintenanceAudit.mockClear();
    api.getShiftById.mockResolvedValue({ success: true, shift: shift("shift-1", "agency-b", "Jamie") });
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };
    renderDetails(
      "super_admin",
      agency("agency-b", "Beacon Supports"),
      "/super-admin/shifts/shift-1?agencyId=agency-b",
      false,
    );

    expect(await screen.findByRole("heading", { name: "Shift details" })).toBeVisible();
    expect(api.getShiftById).toHaveBeenCalledWith(
      "shift-1",
      expect.objectContaining({ agencyId: "agency-b", client: true, employee: true }),
    );
    expect(api.fetchShiftMaintenanceAudit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Edit clock times" })).not.toBeInTheDocument();
  });

  it("ignores a completed detail deletion after the operational agency changes", async () => {
    const deletion = deferred<{ success: true; message: string }>();
    api.deleteShift.mockReturnValueOnce(deletion.promise);
    api.getShiftById
      .mockResolvedValueOnce({ success: true, shift: shift("shared-shift", "agency-a", "Atlas") })
      .mockResolvedValueOnce({ success: true, shift: shift("shared-shift", "agency-b", "Beacon") });
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };

    const view = render(
      <MemoryRouter initialEntries={["/super-admin/shifts/shared-shift?agencyId=agency-a"]}>
        <Routes>
          <Route
            path="/super-admin/shifts/:shiftId"
            element={(
              <OperationalAgencyProvider
                key="agency-a"
                actor="super_admin"
                agencyId="agency-a"
                agency={agency("agency-a", "Atlas Care")}
                mode="ddd"
                capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false } as never}
                data={data}
              >
                <AgencyShiftDetailsPage />
                <LocationProbe />
              </OperationalAgencyProvider>
            )}
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Atlas Client")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Delete shift" }));
    await waitFor(() => expect(
      screen.getByRole("heading", { name: "Delete this shift?" }),
    ).toBeVisible());
    const confirmDelete = screen.getAllByRole("button", { name: "Delete shift" }).at(-1);
    expect(confirmDelete).toBeDefined();
    await waitFor(() => expect(confirmDelete).toBeEnabled());
    await userEvent.click(confirmDelete!);
    await waitFor(() => expect(api.deleteShift).toHaveBeenCalledWith(
      "shared-shift",
      { agencyId: "agency-a" },
    ));

    toast.mockClear();
    view.rerender(
      <MemoryRouter initialEntries={["/super-admin/shifts/shared-shift?agencyId=agency-b"]}>
        <Routes>
          <Route
            path="/super-admin/shifts/:shiftId"
            element={(
              <OperationalAgencyProvider
                key="agency-b"
                actor="super_admin"
                agencyId="agency-b"
                agency={agency("agency-b", "Beacon Supports")}
                mode="ddd"
                capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false } as never}
                data={data}
              >
                <AgencyShiftDetailsPage />
                <LocationProbe />
              </OperationalAgencyProvider>
            )}
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Beacon Client")).toBeVisible();

    await act(async () => {
      deletion.resolve({ success: true, message: "Deleted" });
    });

    expect(screen.getByText("Beacon Client")).toBeVisible();
    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent(
      "/super-admin/shifts/shared-shift?agencyId=agency-a",
    );
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Shift deleted" }));
  });

  it("restores an internal return route and rejects an external return target", async () => {
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };
    const safeReturn = "/super-admin/shifts?agencyIds=agency-b&month=2026-08&view=calendar";
    renderDetails(
      "super_admin",
      agency("agency-b", "Beacon Supports"),
      `/super-admin/shifts/shift-1?agencyId=agency-b&returnTo=${encodeURIComponent(safeReturn)}`,
      false,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Go back" }));
    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent(safeReturn);

    cleanup();
    renderDetails(
      "super_admin",
      agency("agency-b", "Beacon Supports"),
      `/super-admin/shifts/shift-1?agencyId=agency-b&returnTo=${encodeURIComponent("https://evil.example/steal")}`,
      false,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Go back" }));
    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent(
      "/super-admin/shifts/list?agencyId=agency-b",
    );
  });

  it("scopes a real shift-maintenance modal mutation to the selected agency", async () => {
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Maintenance"] } };
    api.updateShift.mockResolvedValue({
      success: true,
      shift: { ...shift("shift-1", "agency-b", "Jamie"), status: "completed" },
    });

    render(
      <RealShiftDetailsModal
        isOpen
        onClose={vi.fn()}
        shift={shift("shift-1", "agency-b", "Jamie") as never}
        agencyId="agency-b"
      />,
    );

    await userEvent.click(screen.getByRole("switch", { name: "Mark shift as completed" }));
    await userEvent.type(screen.getByLabelText("Note for activity history (required)"), "Verified clock record");
    await userEvent.click(screen.getByRole("button", { name: "Update changes" }));

    await waitFor(() => expect(api.updateShift).toHaveBeenCalledWith(
      "shift-1",
      expect.objectContaining({
        status: "completed",
        completedBy: "super-user",
        maintenanceReason: "Verified clock record",
      }),
      { agencyId: "agency-b" },
    ));
  });

  it("passes the selected operational scope into the shared schedule editor", async () => {
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };
    const selectedAgency = agency("agency-b", "Beacon Supports");
    renderScheduling("super_admin", selectedAgency);

    await userEvent.click(await screen.findByRole("button", { name: "Add Schedule" }));

    expect(screen.getByRole("dialog", { name: "Schedule editor" })).toBeVisible();
    expect(modalCapture.addScheduleProps).toMatchObject({
      agencyId: "agency-b",
      agencyMode: "ddd",
      supportedClientTypes: selectedAgency.supportedClientTypes,
      data,
    });
  });

  it("scopes dedicated list, approval, and activity requests and mutations", async () => {
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };
    api.listShifts.mockResolvedValue({
      success: true,
      shifts: [{ ...shift("shift-1", "agency-b", "Jamie"), type: "manual", submissionStatus: "submitted" }],
    });
    renderOperationalPage(ShiftsListPage);

    expect((await screen.findAllByText("Jamie Client")).length).toBeGreaterThan(0);
    expect(api.listShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "agency-b", client: true, employee: true }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    const approvalDialog = screen.getByRole("dialog", { name: "Approve shift?" });
    expect(approvalDialog).toHaveAccessibleDescription(
      "Are you sure you want to approve this manual shift for Jamie Client? This will convert it to an automatic shift.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Approve Shift" }));
    await waitFor(() => expect(api.updateShift).toHaveBeenCalledWith(
      "shift-1",
      { type: "automatic" },
      { agencyId: "agency-b" },
    ));

    cleanup();
    api.listShifts.mockClear();
    api.updateShift.mockClear();
    api.listShifts.mockResolvedValue({
      success: true,
      shifts: [{ ...shift("shift-2", "agency-b", "Taylor"), status: "completed", approved: false }],
    });
    renderOperationalPage(ApprovalsPage);
    expect((await screen.findAllByText("Taylor Client")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Approve Shift" }));
    await waitFor(() => expect(api.updateShift).toHaveBeenCalledWith(
      "shift-2",
      { approved: true },
      { agencyId: "agency-b" },
    ));
    expect(await screen.findByRole("heading", { name: "Approved" })).toBeVisible();

    cleanup();
    api.listShifts.mockClear();
    api.listShifts.mockResolvedValue({ success: true, shifts: [shift("shift-3", "agency-b", "Morgan")] });
    renderOperationalPage(ActivityLogsPage);
    expect((await screen.findAllByText("Morgan Client")).length).toBeGreaterThan(0);
    expect(api.listShifts).toHaveBeenCalledWith(
      expect.objectContaining({ agencyId: "agency-b", client: true, employee: true }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("ignores a completed list approval after the operational agency scope unmounts", async () => {
    const approval = deferred<{ success: true; shift: ReturnType<typeof shift> }>();
    api.updateShift.mockReturnValueOnce(approval.promise);
    api.listShifts
      .mockResolvedValueOnce({
        success: true,
        shifts: [{ ...shift("atlas-shift", "agency-a", "Atlas"), type: "manual" }],
      })
      .mockResolvedValueOnce({
        success: true,
        shifts: [{ ...shift("beacon-shift", "agency-b", "Beacon"), type: "automatic" }],
      });
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };

    const view = render(
      <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=agency-a"]}>
        <OperationalAgencyProvider
          key="agency-a"
          actor="super_admin"
          agencyId="agency-a"
          agency={agency("agency-a", "Atlas Care")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false }}
          data={data}
        >
          <ShiftsListPage />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("Atlas Client")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Approve Shift" }));
    await waitFor(() => expect(api.updateShift).toHaveBeenCalledWith(
      "atlas-shift",
      { type: "automatic" },
      { agencyId: "agency-a" },
    ));

    toast.mockClear();
    view.rerender(
      <MemoryRouter initialEntries={["/super-admin/shifts/list?agencyId=agency-b"]}>
        <OperationalAgencyProvider
          key="agency-b"
          actor="super_admin"
          agencyId="agency-b"
          agency={agency("agency-b", "Beacon Supports")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false }}
          data={data}
        >
          <ShiftsListPage />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("Beacon Client")).length).toBeGreaterThan(0);

    await act(async () => {
      approval.resolve({
        success: true,
        shift: { ...shift("atlas-shift", "agency-a", "Atlas"), type: "automatic" },
      });
    });

    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Success" }));
  });

  it("ignores a failed approval after the operational agency scope unmounts", async () => {
    const approval = deferred<{ success: true; shift: ReturnType<typeof shift> }>();
    api.updateShift.mockReturnValueOnce(approval.promise);
    api.listShifts
      .mockResolvedValueOnce({
        success: true,
        shifts: [{ ...shift("atlas-shift", "agency-a", "Atlas"), status: "completed", approved: false }],
      })
      .mockResolvedValueOnce({
        success: true,
        shifts: [{ ...shift("beacon-shift", "agency-b", "Beacon"), status: "completed", approved: false }],
      });
    auth.user = { uid: "super-user", userType: "super_admin", profile: { accessList: ["Shift Management"] } };

    const view = render(
      <MemoryRouter initialEntries={["/super-admin/shifts/approvals?agencyId=agency-a"]}>
        <OperationalAgencyProvider
          key="agency-a"
          actor="super_admin"
          agencyId="agency-a"
          agency={agency("agency-a", "Atlas Care")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false }}
          data={data}
        >
          <ApprovalsPage />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("Atlas Client")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Approve" }));
    await userEvent.click(screen.getByRole("button", { name: "Approve Shift" }));
    await waitFor(() => expect(api.updateShift).toHaveBeenCalledWith(
      "atlas-shift",
      { approved: true },
      { agencyId: "agency-a" },
    ));

    toast.mockClear();
    view.rerender(
      <MemoryRouter initialEntries={["/super-admin/shifts/approvals?agencyId=agency-b"]}>
        <OperationalAgencyProvider
          key="agency-b"
          actor="super_admin"
          agencyId="agency-b"
          agency={agency("agency-b", "Beacon Supports")}
          mode="ddd"
          capabilities={{ canManageShifts: true, canManageBilling: false, shiftMaintenance: false }}
          data={data}
        >
          <ApprovalsPage />
        </OperationalAgencyProvider>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText("Beacon Client")).length).toBeGreaterThan(0);

    await act(async () => {
      approval.reject(new Error("old agency request failed"));
      await approval.promise.catch(() => undefined);
    });

    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Error" }));
  });
});
