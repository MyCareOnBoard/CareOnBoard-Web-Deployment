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
      clientLocation: null,
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
