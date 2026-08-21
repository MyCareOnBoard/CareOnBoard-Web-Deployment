import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { employeePayrollApi } from "../api/employeePayrollEndpoints";
import type { EmployeePayrollSetupProjection, EmployeePayrollScope } from "../model/types";

const testState = vi.hoisted(() => ({
  requests: [] as Array<{ url: string; method: string; headers?: Record<string, string>; data?: unknown }> ,
  getResponses: [] as Array<Promise<unknown> | unknown>,
  commandResponse: { data: { operationId: "operation-1", state: "accepted", resourceType: "employee", pollAfterMs: null } } as unknown,
  commandResponses: [] as Array<Promise<unknown> | unknown>,
  onboardResponse: { data: { url: "https://onboard.example/session", expiresAt: "2099-01-01T00:00:00.000Z" } } as unknown,
  reconcileResponse: null as unknown,
  modalProps: null as null | {
    requestSession: () => Promise<{ link: string; expiresAt?: string }>;
    onRefetch: () => unknown;
    onClosed?: (refetchedSetup: unknown) => unknown;
    actionLabel?: string;
    autoStartKey?: string;
    onAutoStartConsumed?: (key: string) => void;
    cancelPending?: boolean;
    loadingDialog?: {
      preparing: { title: string; description: string };
      opening: { title: string; description: string };
    };
  },
  modalModuleLoads: 0,
  modalRenders: 0,
  documentFocused: true,
}));

vi.mock("@/lib/baseQuery", () => ({
  customBaseQuery: async (args: { url: string; method: string; headers?: Record<string, string>; data?: unknown }) => {
    testState.requests.push(args);
    if (args.method === "GET") {
      const next = testState.getResponses.shift();
      return next instanceof Promise ? await next : next;
    }
    if (args.url.endsWith("/onboard-session")) return testState.onboardResponse;
    if (args.url.endsWith("/onboard-reconciliation")) return testState.reconcileResponse;
    const next = testState.commandResponses.shift() ?? testState.commandResponse;
    return next instanceof Promise ? await next : next;
  },
}));

vi.mock("../onboard/CheckOnboardModal", () => {
  testState.modalModuleLoads += 1;
  return {
    CheckOnboardModal: (props: {
      requestSession: () => Promise<{ link: string; expiresAt?: string }>;
      onRefetch: () => unknown;
      onClosed?: (refetchedSetup: unknown) => unknown;
      actionLabel?: string;
      autoStartKey?: string;
      onAutoStartConsumed?: (key: string) => void;
      cancelPending?: boolean;
      loadingDialog?: {
        preparing: { title: string; description: string };
        opening: { title: string; description: string };
      };
    }) => {
      testState.modalProps = props;
      testState.modalRenders += 1;
      return <button type="button" onClick={() => void props.requestSession()}>{props.actionLabel ?? "Continue secure setup"}</button>;
    },
  };
});

import MyPayrollTab from "./MyPayrollTab";
import { checkPayrollApi } from "../api/checkPayrollApi";

const scope: EmployeePayrollScope = {
  audience: "employee",
  actorUid: "user-1",
  agencyId: "agency-1",
  employmentId: "employment-1",
};

const projection = (overrides: Partial<EmployeePayrollSetupProjection> = {}): EmployeePayrollSetupProjection => ({
  employmentId: scope.employmentId,
  projectionRevision: 3,
  agencyIntegration: { state: "configured" },
  prerequisites: { values: { legalName: "Ada Lovelace", email: "ada@example.test" }, missingFieldCodes: [], invalidFieldCodes: [] },
  setup: {
    state: "not_started",
    blockers: [],
    onboardingStatus: null,
    blockingStepCodes: [],
    remainingStepCodes: [],
  },
  primaryWorkplace: { selectedClientAssignmentId: null, options: [] },
  capabilities: {
    canStartProvisioning: true,
    canRetryEmployeeSync: true,
    createEmployeeOnboardSession: true,
  },
  ...overrides,
});

const getRequests = () => testState.requests.filter((request) => request.method === "GET");
const commandRequests = () => testState.requests.filter((request) => request.method === "POST" && request.url.endsWith("/commands"));
const sessionRequests = () => testState.requests.filter((request) => request.method === "POST" && request.url.endsWith("/onboard-session"));

function renderPayroll(input: { active?: boolean; payrollScope?: EmployeePayrollScope; store?: ReturnType<typeof makeStore> } = {}) {
  const store = input.store ?? makeStore();
  const view = render(<Provider store={store}><MyPayrollTab scope={input.payrollScope ?? scope} active={input.active ?? true} /></Provider>);
  return { ...view, store };
}

function makeStore() {
  return configureStore({
    reducer: { [checkPayrollApi.reducerPath]: checkPayrollApi.reducer },
    middleware: (getDefault) => getDefault().concat(checkPayrollApi.middleware),
  });
}

function readyResponse(value: EmployeePayrollSetupProjection) {
  return { data: value };
}

describe("MyPayrollTab", () => {
  beforeEach(() => {
    testState.requests = [];
    testState.getResponses = [];
    testState.commandResponse = { data: { operationId: "operation-1", state: "accepted", resourceType: "employee", pollAfterMs: null } };
    testState.commandResponses = [];
    testState.onboardResponse = { data: { url: "https://onboard.example/session", expiresAt: "2099-01-01T00:00:00.000Z" } };
    testState.reconcileResponse = null;
    testState.modalProps = null;
    testState.modalRenders = 0;
    testState.documentFocused = true;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "payroll-action-uuid") });
    vi.spyOn(document, "hasFocus").mockImplementation(() => testState.documentFocused);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps a missing identity closed with no setup or mutation request", async () => {
    renderPayroll({ payrollScope: { ...scope, employmentId: "" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/not available/i);
    expect(screen.getByRole("heading", { name: "Payroll Setup" })).toBeVisible();
    expect(testState.requests).toHaveLength(0);
  });

  it("does not fetch while inactive and reuses retained setup data without another immediate GET", async () => {
    testState.getResponses.push(readyResponse(projection()));
    const store = makeStore();
    const view = renderPayroll({ active: false, store });
    expect(getRequests()).toHaveLength(0);
    view.rerender(<Provider store={store}><MyPayrollTab scope={scope} active /></Provider>);
    expect(await screen.findByRole("button", { name: "Start payroll setup" })).toBeVisible();
    expect(getRequests()).toHaveLength(1);
    view.rerender(<Provider store={store}><MyPayrollTab scope={scope} active={false} /></Provider>);
    view.rerender(<Provider store={store}><MyPayrollTab scope={scope} active /></Provider>);
    expect(getRequests()).toHaveLength(1);
  });

  it("uses a fixed accessible skeleton while setup is loading", async () => {
    testState.getResponses.push(new Promise(() => {}));
    renderPayroll();
    expect(screen.getByRole("status", { name: /loading payroll setup/i })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Loading settings").children).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "My Payroll" })).not.toBeInTheDocument();
  });

  it("withholds personal payroll actions until the agency completes Payroll Setup", async () => {
    testState.getResponses.push(readyResponse(projection({
      agencyIntegration: { state: "missing" },
      setup: { state: "not_started", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] },
    })));
    renderPayroll();
    expect(await screen.findByText("Your agency must complete Payroll Setup before you can start your personal payroll setup.")).toBeVisible();
    const steps = within(screen.getByRole("list", { name: "Payroll setup progress" })).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "Agency payroll connection",
      "Employee payroll record",
      "Payment and tax onboarding",
    ]);
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(within(steps[0]).getByText("Waiting on agency")).toBeVisible();
    expect(within(steps[1]).getByText("Upcoming")).toBeVisible();
    expect(within(steps[2]).getByText("Upcoming")).toBeVisible();
    expect(screen.queryByRole("button", { name: /start payroll setup|continue secure setup|create payroll/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ssn|social security|date of birth|bank account/i)).not.toBeInTheDocument();
  });

  it("scans first, then collects only missing identity details before starting payroll", async () => {
    testState.getResponses.push(
      readyResponse(projection()),
      readyResponse(projection({ prerequisites: { values: { legalName: "", email: "not-an-email" }, missingFieldCodes: ["legalName"], invalidFieldCodes: ["email"] } })),
      readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })),
    );
    const user = userEvent.setup();
    renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByLabelText("Legal name")).toHaveFocus();
    expect(screen.queryByLabelText(/ssn|social security|date of birth|bank|tax|address/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Legal name"), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Remove email" }));
    await user.click(screen.getByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    expect(commandRequests()[0].data).toEqual({ command: "start_provisioning", expectedProjectionRevision: 3, profile: { legalName: "Ada Lovelace", email: null } });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("status", { name: /payroll setup is in progress/i })).toBeVisible();
  });

  it("normalizes a null prefilled legal name without allowing submission", async () => {
    testState.getResponses.push(
      readyResponse(projection()),
      readyResponse(projection({ prerequisites: { values: { legalName: null }, missingFieldCodes: ["legalName"], invalidFieldCodes: [] } })),
    );
    const user = userEvent.setup();
    renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByLabelText("Legal name")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Start payroll setup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your legal name.");
    expect(screen.getByLabelText("Legal name")).toHaveFocus();
    expect(commandRequests()).toHaveLength(0);
  });

  it("renders a retryable setup error and fetches exactly once for the retry", async () => {
    testState.getResponses.push({ error: { status: 500, data: "no" } }, readyResponse(projection()));
    const user = userEvent.setup();
    renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByRole("button", { name: "Start payroll setup" });
    expect(getRequests()).toHaveLength(2);
  });

  it("renders only the server-authorized action and closed blocker copy", async () => {
    testState.getResponses.push(readyResponse(projection({
      setup: { state: "blocked", blockers: ["primary_assignment_required", "unknown_code"], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] },
      capabilities: { canStartProvisioning: false, canRetryEmployeeSync: true, createEmployeeOnboardSession: false },
    })));
    renderPayroll();
    expect(await screen.findByText(/choose a primary work location/i)).toBeVisible();
    expect(screen.getByText(/needs attention from your agency/i)).toBeVisible();
    expect(screen.getByRole("list", { name: "Payroll setup blockers" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry payroll setup" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Start payroll setup" })).not.toBeInTheDocument();
  });

  it.each(["queued", "waiting", "awaiting_provider"] as const)("polls %s exactly once every five seconds while focused", async (state) => {
    vi.useFakeTimers();
    testState.getResponses.push(
      readyResponse(projection({ setup: { state, blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })),
      readyResponse(projection({ setup: { state, blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })),
      readyResponse(projection({ setup: { state, blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })),
    );
    const view = renderPayroll();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole("status", { name: /payroll setup is in progress/i })).toBeVisible();
    expect(getRequests()).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(getRequests()).toHaveLength(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(getRequests()).toHaveLength(3);
    view.rerender(<Provider store={view.store}><MyPayrollTab scope={scope} active={false} /></Provider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(getRequests()).toHaveLength(3);
    view.unmount();
  });

  it.each(["inactive tab", "window blur", "hidden document", "unmount"] as const)("stops polling without a trailing request on %s", async (transition) => {
    vi.useFakeTimers();
    testState.getResponses.push(readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })), readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })));
    const view = renderPayroll();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(getRequests()).toHaveLength(1);

    if (transition === "inactive tab") {
      view.rerender(<Provider store={view.store}><MyPayrollTab scope={scope} active={false} /></Provider>);
    } else if (transition === "window blur") {
      testState.documentFocused = false;
      await act(async () => { window.dispatchEvent(new Event("blur")); });
    } else if (transition === "hidden document") {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    } else {
      view.unmount();
    }

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(getRequests()).toHaveLength(1);
    if (transition === "hidden document") Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    if (transition !== "unmount") view.unmount();
  });

  it("sends one command with one generated key, relies on invalidation refresh, and blocks double click", async () => {
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()), readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })));
    const user = userEvent.setup();
    renderPayroll();
    const button = await screen.findByRole("button", { name: "Start payroll setup" });
    await user.dblClick(button);
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    expect(commandRequests()[0].headers).toEqual({ "Idempotency-Key": "payroll-action-uuid" });
    await screen.findByRole("status", { name: /payroll setup is in progress/i });
    expect(getRequests()).toHaveLength(3);
  });

  it("performs one explicit refetch for a 409 command conflict", async () => {
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()), readyResponse(projection()));
    testState.commandResponse = { error: { status: 409, data: "stale" } };
    const user = userEvent.setup();
    renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    await waitFor(() => expect(getRequests()).toHaveLength(3));
  });

  it("contains a current-scope 409 refresh error in the retryable panel state", async () => {
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()), { error: { status: 500, data: "refresh unavailable" } });
    testState.commandResponse = { error: { status: 409, data: "stale" } };
    const user = userEvent.setup();
    renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be updated/i);
    expect(screen.getByRole("button", { name: "Start payroll setup" })).toBeEnabled();
    expect(commandRequests()).toHaveLength(1);
    expect(getRequests()).toHaveLength(3);
  });

  it("does not refetch or escape when a 409 settles after unmount", async () => {
    let resolveCommand!: (value: unknown) => void;
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()));
    testState.commandResponses.push(new Promise((resolve) => { resolveCommand = resolve; }));
    const user = userEvent.setup();
    const view = renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    view.unmount();
    await act(async () => { resolveCommand({ error: { status: 409, data: "stale" } }); });
    expect(getRequests()).toHaveLength(2);
  });

  it("does not let a stale 409 refetch or clear the current scope action", async () => {
    let resolveOldCommand!: (value: unknown) => void;
    let resolveCurrentCommand!: (value: unknown) => void;
    const currentScope = { ...scope, employmentId: "employment-2" };
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()), readyResponse(projection({ employmentId: currentScope.employmentId })), readyResponse(projection({ employmentId: currentScope.employmentId })));
    testState.commandResponses.push(
      new Promise((resolve) => { resolveOldCommand = resolve; }),
      new Promise((resolve) => { resolveCurrentCommand = resolve; }),
    );
    const user = userEvent.setup();
    const view = renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    view.rerender(<Provider store={view.store}><MyPayrollTab scope={currentScope} active /></Provider>);
    const currentButton = await screen.findByRole("button", { name: "Start payroll setup" });
    await user.click(currentButton);
    expect(await screen.findByRole("button", { name: /Starting payroll setup/ })).toBeDisabled();
    expect(getRequests()).toHaveLength(4);
    await act(async () => { resolveOldCommand({ error: { status: 409, data: "stale" } }); });
    expect(getRequests()).toHaveLength(4);
    expect(screen.getByRole("button", { name: /Starting payroll setup/ })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    view.unmount();
    await act(async () => { resolveCurrentCommand({ data: { operationId: "operation-2", state: "accepted", resourceType: "employee", pollAfterMs: null } }); });
  });

  it("keeps an initially ready setup manual and configures the employee onboarding loader", async () => {
    testState.getResponses.push(
      readyResponse(projection({ setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] } })),
    );
    const user = userEvent.setup();
    renderPayroll();
    expect(await screen.findByRole("button", { name: "Continue payroll setup" })).toBeVisible();
    await waitFor(() => expect(testState.modalProps).not.toBeNull());
    expect(testState.modalModuleLoads).toBe(1);
    expect(testState.modalProps?.autoStartKey).toBeUndefined();
    expect(testState.modalProps?.loadingDialog).toEqual({
      preparing: {
        title: "Preparing your payroll onboarding",
        description: "Creating a secure session with Check. Your setup will open automatically.",
      },
      opening: {
        title: "Opening your payroll onboarding",
        description: "Your secure session is ready. Connecting you to Check now.",
      },
    });
    expect(sessionRequests()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Continue payroll setup" }));
    expect(sessionRequests()).toHaveLength(1);
    act(() => {
      testState.modalProps?.onRefetch();
      testState.modalProps?.onRefetch();
      testState.modalProps?.onRefetch();
    });
    expect(getRequests()).toHaveLength(1);
  });

  it("arms one automatic onboarding launch only after this visit starts provisioning", async () => {
    const ready = projection({
      projectionRevision: 4,
      setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] },
    });
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()), readyResponse(ready));
    const user = userEvent.setup();
    const view = renderPayroll();

    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    await waitFor(() => expect(testState.modalProps?.autoStartKey).toBe("employment-1:auto:payroll-action-uuid"));
    expect(sessionRequests()).toHaveLength(0);

    act(() => { testState.modalProps?.onAutoStartConsumed?.("employment-1:auto:payroll-action-uuid"); });
    await waitFor(() => expect(testState.modalProps?.autoStartKey).toBeUndefined());
    act(() => {
      view.store.dispatch(employeePayrollApi.util.upsertQueryData(
        "getEmployeePayrollSetup",
        scope,
        { ...ready, projectionRevision: 5 },
      ));
    });
    await waitFor(() => expect(testState.modalProps?.autoStartKey).toBeUndefined());
  });

  it("reconciles once on genuine close, directly installs the returned setup, and suppresses legacy refetches", async () => {
    let resolveReconciliation!: (value: unknown) => void;
    const completed = projection({
      projectionRevision: 7,
      setup: { state: "ready", blockers: [], onboardingStatus: "completed", blockingStepCodes: [], remainingStepCodes: [] },
      capabilities: { canStartProvisioning: false, canRetryEmployeeSync: false, createEmployeeOnboardSession: false },
    });
    testState.getResponses.push(readyResponse(projection({
      setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] },
    })));
    testState.reconcileResponse = new Promise((resolve) => { resolveReconciliation = resolve; });
    renderPayroll();
    await waitFor(() => expect(testState.modalProps).not.toBeNull());

    await act(async () => { testState.modalProps?.onRefetch(); });
    expect(getRequests()).toHaveLength(1);
    let firstClose: unknown;
    let duplicateClose: unknown;
    act(() => {
      firstClose = testState.modalProps?.onClosed?.(undefined);
      duplicateClose = testState.modalProps?.onClosed?.(undefined);
    });
    await waitFor(() => expect(testState.requests.filter((request) => request.url.endsWith("/onboard-reconciliation"))).toHaveLength(1));
    expect(screen.getByRole("status", { name: "Updating payroll status" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Continue payroll setup" })).not.toBeInTheDocument();
    await act(async () => {
      resolveReconciliation(readyResponse(completed));
      await Promise.all([firstClose, duplicateClose]);
    });
    expect(getRequests()).toHaveLength(1);
    expect(await screen.findByText(/payroll setup is complete/i)).toBeVisible();
  });

  it("does not install a late close reconciliation into a retired employee scope", async () => {
    let resolveReconciliation!: (value: unknown) => void;
    const nextScope = { ...scope, employmentId: "employment-2" };
    const blocking = projection({
      setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] },
    });
    testState.getResponses.push(
      readyResponse(blocking),
      readyResponse(projection({
        employmentId: nextScope.employmentId,
        setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] },
      })),
    );
    testState.reconcileResponse = new Promise((resolve) => { resolveReconciliation = resolve; });
    const view = renderPayroll();
    await waitFor(() => expect(testState.modalProps).not.toBeNull());
    let closeResult: unknown;
    act(() => { closeResult = testState.modalProps?.onClosed?.(undefined); });
    await waitFor(() => expect(testState.requests.filter((request) => request.url.endsWith("/onboard-reconciliation"))).toHaveLength(1));

    view.rerender(<Provider store={view.store}><MyPayrollTab scope={nextScope} active /></Provider>);
    expect(await screen.findByRole("button", { name: "Continue payroll setup" })).toBeVisible();
    await act(async () => {
      resolveReconciliation(readyResponse(projection({
        projectionRevision: 8,
        setup: { state: "ready", blockers: [], onboardingStatus: "completed", blockingStepCodes: [], remainingStepCodes: [] },
      })));
      await closeResult;
    });

    const retired = employeePayrollApi.endpoints.getEmployeePayrollSetup.select(scope)(view.store.getState());
    expect(retired.data?.setup.onboardingStatus).toBe("blocking");
    expect(screen.queryByText(/payroll setup is complete/i)).not.toBeInTheDocument();
  });

  it("keeps global focus state unchanged when a focused tab unmounts", async () => {
    testState.getResponses.push(readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })));
    const view = renderPayroll();
    await screen.findByRole("status", { name: /payroll setup is in progress/i });
    expect(view.store.getState()[checkPayrollApi.reducerPath].config.focused).toBe(true);
    view.unmount();
    expect(view.store.getState()[checkPayrollApi.reducerPath].config.focused).toBe(true);
  });

  it("renders needs-attention and completed states without unauthorized actions", async () => {
    testState.getResponses.push(readyResponse(projection({
      setup: { state: "needs_attention", blockers: ["unknown_code"], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] },
      capabilities: { canStartProvisioning: false, canRetryEmployeeSync: false, createEmployeeOnboardSession: false },
    })));
    const first = renderPayroll();
    expect(await screen.findByText(/needs attention from your agency/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /retry payroll setup/i })).not.toBeInTheDocument();
    first.unmount();

    testState.getResponses.push(readyResponse(projection({
      setup: { state: "ready", blockers: [], onboardingStatus: "completed", blockingStepCodes: [], remainingStepCodes: [] },
      capabilities: { canStartProvisioning: false, canRetryEmployeeSync: false, createEmployeeOnboardSession: false },
    })));
    renderPayroll();
    expect(await screen.findByText(/payroll setup is complete/i)).toBeVisible();
    const steps = within(screen.getByRole("list", { name: "Payroll setup progress" })).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    steps.forEach((step) => expect(within(step).getByText("Complete")).toBeVisible());
    expect(screen.queryByRole("button", { name: /start payroll setup|retry payroll setup|continue payroll setup/i })).not.toBeInTheDocument();
  });

  it("withholds Continue when the server denies secure onboarding", async () => {
    testState.getResponses.push(readyResponse(projection({
      setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] },
      capabilities: { canStartProvisioning: false, canRetryEmployeeSync: false, createEmployeeOnboardSession: false },
    })));
    renderPayroll();
    await waitFor(() => expect(getRequests()).toHaveLength(1));
    expect(screen.queryByRole("button", { name: "Continue payroll setup" })).not.toBeInTheDocument();
    expect(testState.modalRenders).toBe(0);
    expect(sessionRequests()).toHaveLength(0);
  });
});
