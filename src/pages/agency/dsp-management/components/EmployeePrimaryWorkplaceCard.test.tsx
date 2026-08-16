import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagedEmployeePrimaryWorkplaceProjection, ManagedEmployeePrimaryWorkplaceScope } from "@/features/payroll/model/types";
import { UserType } from "@/utils/auth/types/user.types";

const testState = vi.hoisted(() => ({
  requests: [] as Array<{ url: string; method: string; headers?: Record<string, string> }>,
  getResponses: [] as Array<Promise<unknown> | unknown>,
  commandResponse: { data: { operationId: "operation-1", state: "accepted", resourceType: "employee", pollAfterMs: null } } as unknown,
  user: null as any,
  lazyModuleLoads: 0,
}));

vi.mock("@/lib/baseQuery", () => ({
  customBaseQuery: async (args: { url: string; method: string; headers?: Record<string, string> }) => {
    testState.requests.push(args);
    const response = args.method === "GET" ? testState.getResponses.shift() : testState.commandResponse;
    return response instanceof Promise ? await response : response;
  },
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: testState.user }),
}));

import EmployeePrimaryWorkplaceCard from "./EmployeePrimaryWorkplaceCard";
import { ProfileTab } from "./ProfileTab";
import { checkPayrollApi } from "@/features/payroll/api/checkPayrollApi";
import { agencyPayrollApi } from "@/features/payroll/api/agencyPayrollEndpoints";

const scope: ManagedEmployeePrimaryWorkplaceScope = {
  audience: "agency",
  actorUid: "manager-1",
  agencyId: "agency-1",
  employmentId: "employee-document-1",
};

const projection = (overrides: Partial<ManagedEmployeePrimaryWorkplaceProjection> = {}): ManagedEmployeePrimaryWorkplaceProjection => ({
  employeeId: scope.employmentId,
  projectionRevision: 3,
  primaryWorkplace: {
    selectedClientAssignmentId: null,
    options: [
      { clientAssignmentId: "assignment-1", clientLabel: "Avery Client" },
      { clientAssignmentId: "assignment-2", clientLabel: "Blake Client" },
    ],
  },
  ...overrides,
});

const response = (value: ManagedEmployeePrimaryWorkplaceProjection) => ({ data: value });
const getRequests = () => testState.requests.filter((request) => request.method === "GET");
const commandRequests = () => testState.requests.filter((request) => request.method === "POST");
const dsp = {
  id: "canonical-dsp-id",
  uid: "non-canonical-uid",
  userId: "non-canonical-user-id",
  fullName: "Avery Employee",
  email: "avery@example.com",
  bio: "",
  dateOfBirth: "",
  workAvailability: false,
  hireDate: "",
  profilePicture: "",
  tagId: "",
  role: "DSP",
  address: "",
  phoneNumber: "",
  emergencyContact: { name: "", relationship: "", phone: "" },
};

function makeStore() {
  return configureStore({
    reducer: { [checkPayrollApi.reducerPath]: checkPayrollApi.reducer },
    middleware: (getDefault) => getDefault().concat(checkPayrollApi.middleware),
  });
}

function renderCard(input: { payrollScope?: ManagedEmployeePrimaryWorkplaceScope; store?: ReturnType<typeof makeStore> } = {}) {
  const store = input.store ?? makeStore();
  return render(<Provider store={store}><EmployeePrimaryWorkplaceCard scope={input.payrollScope ?? scope} /></Provider>);
}

describe("EmployeePrimaryWorkplaceCard", () => {
  beforeEach(() => {
    testState.requests = [];
    testState.getResponses = [];
    testState.commandResponse = { data: { operationId: "operation-1", state: "accepted", resourceType: "employee", pollAfterMs: null } };
    testState.user = null;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "manager-action-uuid") });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses only the canonical DSP document ID for its setup query", async () => {
    testState.getResponses.push(response(projection()));
    renderCard({ payrollScope: { ...scope, employmentId: "canonical-dsp-id" } });
    await screen.findByRole("radiogroup", { name: "Choose a primary work location" });
    expect(getRequests()).toHaveLength(1);
    expect(getRequests()[0].url).toContain("canonical-dsp-id");
  });

  it.each([["Payroll View"], ["Signer"]])("does not load or query the card for non-manager staff", async (accessList) => {
    testState.user = { uid: "manager-1", agencyId: "agency-1", userType: UserType.AGENCY_STAFF, profile: { accessList } };
    render(<Provider store={makeStore()}><ProfileTab dsp={dsp} onDeactivate={() => undefined} onActivate={() => undefined} /></Provider>);
    expect(await screen.findByText("Date of Birth")).toBeVisible();
    expect(screen.queryByRole("radiogroup", { name: "Choose a primary work location" })).not.toBeInTheDocument();
    expect(getRequests()).toHaveLength(0);
  });

  it("loads the card for a payroll manager using dsp.id rather than UID fields", async () => {
    testState.user = { uid: "manager-1", agencyId: "agency-1", userType: UserType.AGENCY_STAFF, profile: { accessList: ["Payroll Management"] } };
    testState.getResponses.push(response(projection({ employeeId: dsp.id })));
    render(<Provider store={makeStore()}><ProfileTab dsp={dsp} onDeactivate={() => undefined} onActivate={() => undefined} /></Provider>);
    await screen.findByRole("radiogroup", { name: "Choose a primary work location" });
    expect(getRequests()).toHaveLength(1);
    expect(getRequests()[0].url).toContain(dsp.id);
    expect(getRequests()[0].url).not.toContain(dsp.uid!);
    expect(getRequests()[0].url).not.toContain(dsp.userId);
  });

  it("does not load the lazy card module for unauthorized staff, but loads it once for a payroll manager", async () => {
    vi.resetModules();
    testState.lazyModuleLoads = 0;
    vi.doMock("./EmployeePrimaryWorkplaceCard", () => {
      testState.lazyModuleLoads += 1;
      return { default: () => null };
    });
    const { ProfileTab: IsolatedProfileTab } = await import("./ProfileTab");

    testState.user = { uid: "manager-1", agencyId: "agency-1", userType: UserType.AGENCY_STAFF, profile: { accessList: ["Payroll View"] } };
    const unauthorized = render(<Provider store={makeStore()}><IsolatedProfileTab dsp={dsp} onDeactivate={() => undefined} onActivate={() => undefined} /></Provider>);
    expect(await screen.findByText("Date of Birth")).toBeVisible();
    expect(testState.lazyModuleLoads).toBe(0);
    expect(getRequests()).toHaveLength(0);
    unauthorized.unmount();

    testState.user = { uid: "manager-1", agencyId: "agency-1", userType: UserType.AGENCY_STAFF, profile: { accessList: ["Payroll Management"] } };
    render(<Provider store={makeStore()}><IsolatedProfileTab dsp={dsp} onDeactivate={() => undefined} onActivate={() => undefined} /></Provider>);
    await waitFor(() => expect(testState.lazyModuleLoads).toBe(1));

    vi.doUnmock("./EmployeePrimaryWorkplaceCard");
    vi.resetModules();
  });

  it.each([
    { selectedClientAssignmentId: null, options: [] },
    { selectedClientAssignmentId: null, options: [{ clientAssignmentId: "assignment-1", clientLabel: "Avery Client" }] },
  ])("does not render a chooser when the server returns insufficient options", async (primaryWorkplace) => {
    testState.getResponses.push(response(projection({ primaryWorkplace })));
    renderCard();
    await waitFor(() => expect(getRequests()).toHaveLength(1));
    expect(screen.queryByRole("radiogroup", { name: "Choose a primary work location" })).not.toBeInTheDocument();
  });

  it("shows selected current data rather than a chooser", async () => {
    testState.getResponses.push(response(projection({ primaryWorkplace: {
      selectedClientAssignmentId: "assignment-2",
      options: [{ clientAssignmentId: "assignment-1", clientLabel: "Avery Client" }, { clientAssignmentId: "assignment-2", clientLabel: "Blake Client" }],
    } })));
    renderCard();
    expect(await screen.findByText("Primary work location: Blake Client")).toBeVisible();
    expect(screen.queryByRole("radiogroup", { name: "Choose a primary work location" })).not.toBeInTheDocument();
  });

  it("requires an accessible selection and ordinary-primary-work-location attestation", async () => {
    testState.getResponses.push(response(projection()));
    const user = userEvent.setup();
    renderCard();
    const group = await screen.findByRole("radiogroup", { name: "Choose a primary work location" });
    expect(group).toBeVisible();
    expect(screen.getByRole("radio", { name: "Avery Client" })).not.toBeChecked();
    const submit = screen.getByRole("button", { name: "Save primary work location" });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Avery Client" }));
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    expect(submit).toBeEnabled();
  });

  it("submits the current revision and selection once with a caller-created key", async () => {
    testState.getResponses.push(response(projection()), response(projection({ primaryWorkplace: { selectedClientAssignmentId: "assignment-1", options: [{ clientAssignmentId: "assignment-1", clientLabel: "Avery Client" }, { clientAssignmentId: "assignment-2", clientLabel: "Blake Client" }] } })));
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    await user.dblClick(screen.getByRole("button", { name: "Save primary work location" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    expect(commandRequests()[0]).toMatchObject({
      headers: { "Idempotency-Key": "manager-action-uuid" },
      data: { command: "set_employee_primary_workplace", employeeId: scope.employmentId, clientAssignmentId: "assignment-1", attestation: { ordinaryPrimaryWorkLocation: true }, expectedProjectionRevision: 3 },
    });
    expect(await screen.findByText("Primary work location: Avery Client")).toBeVisible();
    expect(getRequests()).toHaveLength(2);
  });

  it("keeps a pending command locked across a projection revision and resets the form for the new revision", async () => {
    let settleCommand!: (response: unknown) => void;
    const store = makeStore();
    testState.getResponses.push(
      response(projection()),
      response(projection({
        projectionRevision: 4,
        primaryWorkplace: {
          selectedClientAssignmentId: "assignment-1",
          options: [{ clientAssignmentId: "assignment-1", clientLabel: "Avery Client" }, { clientAssignmentId: "assignment-2", clientLabel: "Blake Client" }],
        },
      })),
    );
    testState.commandResponse = new Promise((resolve) => { settleCommand = resolve; });
    const user = userEvent.setup();
    renderCard({ store });
    await user.click(await screen.findByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    await user.click(screen.getByRole("button", { name: "Save primary work location" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));

    act(() => {
      store.dispatch(agencyPayrollApi.util.updateQueryData("getManagedEmployeePrimaryWorkplace", scope, (draft) => {
        draft.projectionRevision = 4;
      }));
    });
    await waitFor(() => expect(screen.getByRole("radio", { name: "Avery Client" })).not.toBeChecked());
    expect(screen.getByRole("checkbox", { name: /ordinary primary work location/i })).not.toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    expect(screen.getByRole("radio", { name: "Avery Client" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Blake Client" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /ordinary primary work location/i })).toBeDisabled();
    const submit = screen.getByRole("button", { name: /save|saving primary work location/i });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(commandRequests()).toHaveLength(1);

    await act(async () => { settleCommand({ data: { operationId: "operation-1", state: "accepted", resourceType: "employee", pollAfterMs: null } }); });
    expect(await screen.findByText("Primary work location: Avery Client")).toBeVisible();
  });

  it("clears the form and explicitly refetches the same employee exactly once on a 409", async () => {
    testState.getResponses.push(response(projection()), response(projection()));
    testState.commandResponse = { error: { status: 409, data: "stale" } };
    const user = userEvent.setup();
    renderCard({ payrollScope: { ...scope, employmentId: "canonical-dsp-id" } });
    await user.click(await screen.findByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    await user.click(screen.getByRole("button", { name: "Save primary work location" }));
    await waitFor(() => expect(getRequests()).toHaveLength(2));
    expect(getRequests().every((request) => request.url.includes("canonical-dsp-id"))).toBe(true);
    expect(screen.getByRole("radio", { name: "Avery Client" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /ordinary primary work location/i })).not.toBeChecked();
  });

  it("does not refetch or mutate after a deferred 409 settles on an unmounted card", async () => {
    let settleCommand!: (response: unknown) => void;
    testState.getResponses.push(response(projection()));
    testState.commandResponse = new Promise((resolve) => { settleCommand = resolve; });
    const user = userEvent.setup();
    const view = renderCard();
    await user.click(await screen.findByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    await user.click(screen.getByRole("button", { name: "Save primary work location" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    view.unmount();

    await act(async () => { settleCommand({ error: { status: 409, data: "stale" } }); });
    expect(getRequests()).toHaveLength(1);
  });

  it("does not let a deferred 409 from an old scope clear or refetch the current scope", async () => {
    let settleCommand!: (response: unknown) => void;
    const oldScope = { ...scope, actorUid: "manager-old", agencyId: "agency-old", employmentId: "employee-old" };
    const nextScope = { ...scope, actorUid: "manager-new", agencyId: "agency-new", employmentId: "employee-new" };
    const store = makeStore();
    testState.getResponses.push(response(projection({ employeeId: oldScope.employmentId })), response(projection({ employeeId: nextScope.employmentId })));
    testState.commandResponse = new Promise((resolve) => { settleCommand = resolve; });
    const user = userEvent.setup();
    const view = renderCard({ payrollScope: oldScope, store });
    await user.click(await screen.findByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    await user.click(screen.getByRole("button", { name: "Save primary work location" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));

    view.rerender(<Provider store={store}><EmployeePrimaryWorkplaceCard scope={nextScope} /></Provider>);
    await screen.findByRole("radiogroup", { name: "Choose a primary work location" });
    expect(screen.getByRole("radio", { name: "Avery Client" })).toBeEnabled();
    await user.click(screen.getByRole("radio", { name: "Avery Client" }));
    await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
    expect(screen.getByRole("radio", { name: "Avery Client" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /ordinary primary work location/i })).toBeChecked();
    expect(getRequests()).toHaveLength(2);

    await act(async () => { settleCommand({ error: { status: 409, data: "stale" } }); });
    expect(getRequests()).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Avery Client" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /ordinary primary work location/i })).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("contains a current-scope 409 refetch rejection in a retryable error without a retry loop", async () => {
    let resolveRefetch!: (response: unknown) => void;
    const unhandled = vi.fn();
    window.addEventListener("unhandledrejection", unhandled);
    try {
      testState.getResponses.push(response(projection()), new Promise((resolve) => { resolveRefetch = resolve; }));
      testState.commandResponse = { error: { status: 409, data: "stale" } };
      const user = userEvent.setup();
      renderCard();
      await user.click(await screen.findByRole("radio", { name: "Avery Client" }));
      await user.click(screen.getByRole("checkbox", { name: /ordinary primary work location/i }));
      await user.click(screen.getByRole("button", { name: "Save primary work location" }));
      await waitFor(() => expect(getRequests()).toHaveLength(2));

      await act(async () => { resolveRefetch({ error: { status: 500, data: "refresh failed" } }); });
      expect(await screen.findByRole("alert")).toHaveTextContent(/could not be refreshed.*try again/i);
      expect(screen.getByRole("radio", { name: "Avery Client" })).toBeEnabled();
      expect(screen.getByRole("checkbox", { name: /ordinary primary work location/i })).toBeEnabled();
      expect(getRequests()).toHaveLength(2);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("unhandledrejection", unhandled);
    }
  });
});
