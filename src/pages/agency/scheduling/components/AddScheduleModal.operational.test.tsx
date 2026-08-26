import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OperationalAgencyDataAdapter } from "@/lib/operational-agency/types";
import AddScheduleModal, { type ScheduleFormData } from "./AddScheduleModal";

const toast = vi.hoisted(() => vi.fn());
const shiftApi = vi.hoisted(() => ({
  updateShift: vi.fn(),
  listShifts: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  default: {},
}));

vi.mock("@/lib/api/shifts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/shifts")>("@/lib/api/shifts");
  return {
    ...actual,
    updateShift: shiftApi.updateShift,
    listShifts: shiftApi.listShifts,
  };
});

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: { uid: "super-user", id: "legacy-user-id", fullName: "Super Admin" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("./ScheduleSavedModal", () => ({ default: () => null }));
vi.mock("./ScheduleSuccessModal", () => ({ default: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createDataAdapter(): OperationalAgencyDataAdapter {
  return {
    searchClients: vi.fn(),
    searchStaff: vi.fn(),
    listServices: vi.fn(),
    getClientSchedulingContext: vi.fn(),
    getStaffSchedulingContext: vi.fn(),
    createStaffActivity: vi.fn(),
    createGoalDocument: vi.fn(),
  };
}

function modalElement(
  data: OperationalAgencyDataAdapter,
  overrides: Partial<React.ComponentProps<typeof AddScheduleModal>> = {},
) {
  return (
    <AddScheduleModal
      isOpen
      onClose={vi.fn()}
      agencyId="agency-b"
      agencyName="Beacon Supports"
      agencyMode="ddd"
      supportedClientTypes={["ddd"]}
      data={data}
      {...overrides}
    />
  );
}

function renderModal(data: OperationalAgencyDataAdapter) {
  return render(
    modalElement(data),
  );
}

function editableShift(overrides: Partial<ScheduleFormData> = {}): ScheduleFormData {
  return {
    shiftId: "shift-1",
    client: "Jamie Client",
    clientId: "client-1",
    clientLocation: { address: "1 Old Main St" },
    serviceLocationSource: "primaryAddress",
    assignedDsp: "Robin Staff",
    assignedDspId: "staff-1",
    billingRate: "20",
    serviceCode: "H2021",
    notesType: "Service Log",
    schedulingType: "one-time",
    date: new Date("2026-08-10T12:00:00Z"),
    startDate: null,
    endDate: null,
    clockInTime: "09:00:AM",
    clockOutTime: "11:00:AM",
    ispOutcome: "",
    planOfCare: null,
    goalsType: "",
    ...overrides,
  };
}

async function runClientSearch(query: string) {
  fireEvent.change(screen.getByPlaceholderText("Search client name..."), {
    target: { value: query },
  });
  await act(async () => {
    vi.advanceTimersByTime(300);
    await Promise.resolve();
  });
}

describe("AddScheduleModal operational data boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.mockReset();
    shiftApi.updateShift.mockReset();
    shiftApi.listShifts.mockReset();
    shiftApi.listShifts.mockResolvedValue({ success: true, shifts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads selected client context through the injected scoped adapter", async () => {
    const data = createDataAdapter();
    vi.mocked(data.searchClients).mockResolvedValue({
      items: [{ id: "client-1", name: "Jamie Client", mode: "ddd" }],
      truncated: false,
      scanLimit: null,
    });
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [],
    });

    renderModal(data);

    expect(screen.getByRole("dialog", { name: "Schedule editor" })).toBeVisible();
    expect(screen.getByText("Scheduling for Beacon Supports")).toBeVisible();
    await runClientSearch("Jam");
    fireEvent.click(screen.getByRole("button", { name: /Jamie Client/i }));
    await act(async () => Promise.resolve());

    expect(data.getClientSchedulingContext).toHaveBeenCalledWith(
      "client-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByPlaceholderText("Search client name...")).toHaveValue("Jamie Client");
  }, 15_000);

  it("defaults payroll workplace selection to primary and allows an available secondary address", async () => {
    const data = createDataAdapter();
    vi.mocked(data.searchClients).mockResolvedValue({
      items: [{ id: "client-1", name: "Jamie Client", mode: "ddd" }],
      truncated: false,
      scanLimit: null,
    });
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [],
      primaryAddress: { address: "1 Main St", countyState: "Newark, NJ", zipCode: "07102" },
      secondaryAddress: { address: "9 Broad St", countyState: "Newark, NJ", zipCode: "07102" },
      payrollServiceLocations: [
        { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
        { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
      ],
    });

    renderModal(data);
    await runClientSearch("Jam");
    fireEvent.click(screen.getByRole("button", { name: /Jamie Client/i }));
    await act(async () => Promise.resolve());

    expect(screen.getByText("Service location for payroll")).toBeVisible();
    const primary = screen.getByRole("radio", { name: /Primary address — 1 Main St/i });
    const secondary = screen.getByRole("radio", { name: /Secondary address — 9 Broad St/i });
    expect(primary).toBeChecked();
    fireEvent.click(secondary);
    expect(secondary).toBeChecked();
    expect(screen.getByText(/determines the Check workplace used for payroll/i)).toBeVisible();
    expect(screen.getByText(/later client address changes do not rewrite this shift/i)).toBeVisible();
  });

  it("selects secondary when it is the first confirmed payroll service location", async () => {
    const data = createDataAdapter();
    vi.mocked(data.searchClients).mockResolvedValue({
      items: [{ id: "client-1", name: "Jamie Client", mode: "ddd" }],
      truncated: false,
      scanLimit: null,
    });
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [],
      primaryAddress: { address: "1 Main St", countyState: "Newark, NJ", zipCode: "07102" },
      secondaryAddress: { address: "9 Broad St", countyState: "Newark, NJ", zipCode: "07102" },
      payrollServiceLocations: [
        { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
      ],
    });

    renderModal(data);
    await runClientSearch("Jam");
    fireEvent.click(screen.getByRole("button", { name: /Jamie Client/i }));
    await act(async () => Promise.resolve());

    expect(screen.queryByRole("radio", { name: /Primary address/i })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Secondary address — 9 Broad St/i })).toBeChecked();
    expect(screen.getByText("Selected payroll service location: 9 Broad St")).toBeVisible();
    expect(screen.queryByText(/Location:.*1 Main St/i)).not.toBeInTheDocument();
  });

  it("shows the saved historical payroll location when editing and uses current data only for a switch", async () => {
    const data = createDataAdapter();
    const editData: ScheduleFormData = {
      shiftId: "shift-1",
      client: "Jamie Client",
      clientId: "client-1",
      clientLocation: { address: "1 Old Main St" },
      serviceLocationSource: "primaryAddress",
      assignedDsp: "Robin Staff",
      assignedDspId: "staff-1",
      billingRate: "20",
      serviceCode: "H2021",
      notesType: "Service Log",
      schedulingType: "one-time",
      date: new Date("2026-08-10T12:00:00Z"),
      startDate: null,
      endDate: null,
      clockInTime: "09:00:AM",
      clockOutTime: "11:00:AM",
      ispOutcome: "",
      planOfCare: null,
      goalsType: "",
    };
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [{ id: "service-1", code: "H2021", name: "Community support" }],
      primaryAddress: { address: "2 New Main St" },
      secondaryAddress: { address: "9 Broad St" },
      payrollServiceLocations: [
        { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
        { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
      ],
    });

    render(modalElement(data, { mode: "edit", editData }));
    await act(async () => Promise.resolve());

    expect(screen.getByRole("radio", { name: /Primary address — 1 Old Main St — saved for this shift/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Secondary address — 9 Broad St — switch payroll location/i })).not.toBeChecked();
    expect(screen.queryByRole("radio", { name: /2 New Main St/i })).not.toBeInTheDocument();
  });

  it("stops using a saved historical location after the service date changes", async () => {
    const data = createDataAdapter();
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [{ id: "service-1", code: "H2021", name: "Community support" }],
      primaryAddress: { address: "2 Current Main St" },
      payrollServiceLocations: [{
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-08-11",
      }],
    });

    render(modalElement(data, { mode: "edit", editData: editableShift() }));
    await act(async () => Promise.resolve());

    expect(screen.getByRole("radio", { name: /1 Old Main St — saved for this shift/i })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "10 August" }));
    const changedDate = screen.getAllByRole("button", { name: "9" }).find(
      (button) => !button.hasAttribute("disabled"),
    );
    expect(changedDate).toBeDefined();
    fireEvent.click(changedDate as HTMLElement);

    expect(screen.queryByText(/1 Old Main St/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/no confirmed payroll service location for the shift date/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText(
      "Confirm a client payroll service location that is effective on the shift date.",
    )).toBeVisible();
    expect(shiftApi.updateShift).not.toHaveBeenCalled();
  });

  it("stops using a saved historical location after the client changes", async () => {
    const data = createDataAdapter();
    vi.mocked(data.searchClients).mockResolvedValue({
      items: [{ id: "client-2", name: "Jordan Client", mode: "ddd" }],
      truncated: false,
      scanLimit: null,
    });
    vi.mocked(data.getClientSchedulingContext).mockImplementation(async (clientId) => ({
      id: clientId,
      type: "ddd",
      firstName: clientId === "client-1" ? "Jamie" : "Jordan",
      lastName: "Client",
      services: [{ id: "service-1", code: "H2021", name: "Community support" }],
      primaryAddress: { address: clientId === "client-1" ? "2 Current Main St" : "8 New Client St" },
      payrollServiceLocations: clientId === "client-1" ? [] : undefined,
    }));

    render(modalElement(data, { mode: "edit", editData: editableShift() }));
    await act(async () => Promise.resolve());
    expect(screen.getByRole("radio", { name: /1 Old Main St — saved for this shift/i })).toBeChecked();

    await runClientSearch("Jordan");
    fireEvent.click(screen.getByRole("button", { name: /Jordan Client/i }));
    await act(async () => Promise.resolve());

    expect(screen.queryByText(/1 Old Main St/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/no confirmed payroll service location for the shift date/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled();
  });

  it("clears stale payroll location options while a rerendered edit client is loading", async () => {
    const data = createDataAdapter();
    const nextClient = deferred<Awaited<ReturnType<OperationalAgencyDataAdapter["getClientSchedulingContext"]>>>();
    const firstEdit: ScheduleFormData = {
      shiftId: "shift-1",
      client: "Jamie Client",
      clientId: "client-1",
      clientLocation: { address: "1 Saved St" },
      serviceLocationSource: "primaryAddress",
      assignedDsp: "Robin Staff",
      assignedDspId: "staff-1",
      billingRate: "20",
      serviceCode: "H2021",
      notesType: "Service Log",
      schedulingType: "one-time",
      date: new Date("2026-08-10T12:00:00Z"),
      startDate: null,
      endDate: null,
      clockInTime: "09:00:AM",
      clockOutTime: "11:00:AM",
      ispOutcome: "",
      planOfCare: null,
      goalsType: "",
    };
    const secondEdit: ScheduleFormData = {
      ...firstEdit,
      shiftId: "shift-2",
      client: "Jordan Client",
      clientId: "client-2",
      clientLocation: { address: "2 Saved St" },
    };
    vi.mocked(data.getClientSchedulingContext)
      .mockResolvedValueOnce({
        id: "client-1",
        type: "ddd",
        firstName: "Jamie",
        lastName: "Client",
        services: [{ id: "service-1", code: "H2021", name: "Community support" }],
        primaryAddress: { address: "1 Current St" },
        secondaryAddress: { address: "11 Switch St" },
        payrollServiceLocations: [
          { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
          { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
        ],
      })
      .mockReturnValueOnce(nextClient.promise);

    const view = render(modalElement(data, { mode: "edit", editData: firstEdit }));
    await act(async () => Promise.resolve());
    expect(screen.getByRole("radio", { name: /11 Switch St/i })).toBeVisible();

    view.rerender(modalElement(data, { mode: "edit", editData: secondEdit }));
    await act(async () => Promise.resolve());
    expect(screen.queryByText("Service location for payroll")).not.toBeInTheDocument();

    await act(async () => {
      nextClient.resolve({
        id: "client-2",
        type: "ddd",
        firstName: "Jordan",
        lastName: "Client",
        services: [{ id: "service-2", code: "H2021", name: "Community support" }],
        primaryAddress: { address: "2 Current St" },
        secondaryAddress: { address: "22 Switch St" },
        payrollServiceLocations: [
          { source: "primaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
          { source: "secondaryAddress", attestedActualServiceLocation: true, effectiveFrom: "2026-01-01" },
        ],
      });
      await nextClient.promise;
    });
    expect(screen.getByRole("radio", { name: /Primary address — 2 Saved St/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Secondary address — 22 Switch St/i })).not.toBeChecked();
    expect(screen.queryByRole("radio", { name: /11 Switch St/i })).not.toBeInTheDocument();
  });

  it("guides scheduling when no public payroll service location is confirmed and effective", async () => {
    const data = createDataAdapter();
    const editData: ScheduleFormData = {
      shiftId: "shift-1",
      client: "Jamie Client",
      clientId: "client-1",
      clientLocation: null,
      serviceLocationSource: "primaryAddress",
      assignedDsp: "Robin Staff",
      assignedDspId: "staff-1",
      billingRate: "20",
      serviceCode: "H2021",
      notesType: "Service Log",
      schedulingType: "one-time",
      date: new Date("2026-08-10T12:00:00Z"),
      startDate: null,
      endDate: null,
      clockInTime: "09:00:AM",
      clockOutTime: "11:00:AM",
      ispOutcome: "",
      planOfCare: null,
      goalsType: "",
    };
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [{ id: "service-1", code: "H2021", name: "Community support" }],
      primaryAddress: { address: "1 Current St" },
      secondaryAddress: { address: "9 Broad St" },
      payrollServiceLocations: [{
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-08-11",
      }],
    });

    render(modalElement(data, { mode: "edit", editData }));
    await act(async () => Promise.resolve());

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(
      "This client has no confirmed payroll service location for the shift date. Add one on the client record before scheduling.",
    )).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(
      "Confirm a client payroll service location that is effective on the shift date.",
    )).toBeVisible();
    expect(shiftApi.updateShift).not.toHaveBeenCalled();
  });

  it("requires choosing a client search result before saving", () => {
    const data = createDataAdapter();
    renderModal(data);

    fireEvent.change(screen.getByPlaceholderText("Search client name..."), {
      target: { value: "Typed but not selected" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Choose a client from the search results.")).toBeVisible();
    expect(shiftApi.updateShift).not.toHaveBeenCalled();
  });

  it("does not let a stale client context overwrite a newer selection", async () => {
    const data = createDataAdapter();
    const first = deferred<Awaited<ReturnType<OperationalAgencyDataAdapter["getClientSchedulingContext"]>>>();
    const second = deferred<Awaited<ReturnType<OperationalAgencyDataAdapter["getClientSchedulingContext"]>>>();
    vi.mocked(data.searchClients)
      .mockResolvedValueOnce({
        items: [{ id: "client-1", name: "Jamie Client", mode: "ddd" }],
        truncated: false,
        scanLimit: null,
      })
      .mockResolvedValueOnce({
        items: [{ id: "client-2", name: "Jordan Client", mode: "ddd" }],
        truncated: false,
        scanLimit: null,
      });
    vi.mocked(data.getClientSchedulingContext)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    renderModal(data);
    await runClientSearch("Jam");
    fireEvent.click(screen.getByRole("button", { name: /Jamie Client/i }));
    await runClientSearch("Jor");
    fireEvent.click(screen.getByRole("button", { name: /Jordan Client/i }));

    await act(async () => {
      second.resolve({
        id: "client-2",
        type: "ddd",
        firstName: "Jordan",
        lastName: "Client",
        services: [],
      });
      await second.promise;
    });
    expect(screen.getByPlaceholderText("Search client name...")).toHaveValue("Jordan Client");

    await act(async () => {
      first.resolve({
        id: "client-1",
        type: "ddd",
        firstName: "Jamie",
        lastName: "Client",
        services: [],
      });
      await first.promise;
    });
    expect(screen.getByPlaceholderText("Search client name...")).toHaveValue("Jordan Client");
  });

  it("does not let pending client context repopulate a client search the user edited", async () => {
    const data = createDataAdapter();
    const context = deferred<Awaited<ReturnType<OperationalAgencyDataAdapter["getClientSchedulingContext"]>>>();
    vi.mocked(data.searchClients).mockResolvedValue({
      items: [{ id: "client-1", name: "Jamie Client", mode: "ddd" }],
      truncated: false,
      scanLimit: null,
    });
    vi.mocked(data.getClientSchedulingContext).mockReturnValue(context.promise);

    renderModal(data);
    await runClientSearch("Jam");
    fireEvent.click(screen.getByRole("button", { name: /Jamie Client/i }));
    fireEvent.change(screen.getByPlaceholderText("Search client name..."), {
      target: { value: "New client" },
    });

    await act(async () => {
      context.resolve({
        id: "client-1",
        type: "ddd",
        firstName: "Jamie",
        lastName: "Client",
        services: [],
      });
      await context.promise;
    });

    expect(screen.getByPlaceholderText("Search client name...")).toHaveValue("New client");
  });

  it("clears the pending client-search indicator when the query becomes too short", async () => {
    const data = createDataAdapter();
    const search = deferred<Awaited<ReturnType<OperationalAgencyDataAdapter["searchClients"]>>>();
    vi.mocked(data.searchClients).mockReturnValue(search.promise);
    const view = renderModal(data);

    await runClientSearch("Jam");
    expect(view.container.querySelector("svg.animate-spin")).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Search client name..."), {
      target: { value: "J" },
    });

    expect(view.container.querySelector("svg.animate-spin")).toBeNull();
  });

  it("suppresses a save response that completes after the editor closes", async () => {
    const data = createDataAdapter();
    const update = deferred<{ success: true; shift: { id: string } }>();
    const onShiftsUpdated = vi.fn();
    const editData: ScheduleFormData = {
      shiftId: "shift-1",
      client: "Jamie Client",
      clientId: "client-1",
      clientLocation: { address: "1 Historical Main St" },
      serviceLocationSource: "primaryAddress",
      assignedDsp: "Robin Staff",
      assignedDspId: "staff-1",
      billingRate: "20",
      coverage: "payer",
      splitMode: null,
      splitValue: null,
      serviceCode: "H2021",
      serviceAuthorizationId: "service-1",
      notesType: "Service Log",
      schedulingType: "one-time",
      date: new Date("2026-08-10T12:00:00Z"),
      startDate: null,
      endDate: null,
      clockInTime: "09:00:AM",
      clockOutTime: "11:00:AM",
      ispOutcome: "",
      planOfCare: null,
      goalsType: "",
    };
    vi.mocked(data.getClientSchedulingContext).mockResolvedValue({
      id: "client-1",
      type: "ddd",
      firstName: "Jamie",
      lastName: "Client",
      services: [{ id: "service-1", code: "H2021", name: "Community support" }],
      primaryAddress: { address: "1 Main St" },
      payrollServiceLocations: [{
        source: "primaryAddress",
        attestedActualServiceLocation: true,
        effectiveFrom: "2026-01-01",
      }],
    });
    shiftApi.updateShift.mockReturnValue(update.promise);

    const view = render(modalElement(data, {
      mode: "edit",
      editData,
      onShiftsUpdated,
    }));
    await act(async () => Promise.resolve());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(shiftApi.updateShift).toHaveBeenCalledTimes(1);
    expect(shiftApi.updateShift).toHaveBeenCalledWith(
      "shift-1",
      expect.not.objectContaining({
        location: expect.anything(),
        serviceLocationSource: expect.anything(),
      }),
      expect.objectContaining({ agencyId: "agency-b" }),
    );

    view.rerender(modalElement(data, {
      isOpen: false,
      mode: "edit",
      editData,
      onShiftsUpdated,
    }));
    await act(async () => {
      update.resolve({ success: true, shift: { id: "shift-1" } });
      await update.promise;
    });

    expect(shiftApi.listShifts).not.toHaveBeenCalled();
    expect(onShiftsUpdated).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Changes Saved" }));
  });
});
