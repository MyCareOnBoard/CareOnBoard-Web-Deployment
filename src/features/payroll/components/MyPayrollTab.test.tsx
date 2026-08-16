import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { EmployeePayrollSetupProjection, EmployeePayrollScope } from "../model/types";

const testState = vi.hoisted(() => ({
  requests: [] as Array<{ url: string; method: string; headers?: Record<string, string> }> ,
  getResponses: [] as Array<Promise<unknown> | unknown>,
  commandResponse: { data: { operationId: "operation-1", state: "accepted", resourceType: "employee", pollAfterMs: null } } as unknown,
  onboardResponse: { data: { url: "https://onboard.example/session", expiresAt: "2099-01-01T00:00:00.000Z" } } as unknown,
  modalProps: null as null | { requestSession: () => Promise<{ link: string; expiresAt?: string }>; onRefetch: () => void },
}));

vi.mock("@/lib/baseQuery", () => ({
  customBaseQuery: async (args: { url: string; method: string; headers?: Record<string, string> }) => {
    testState.requests.push(args);
    if (args.method === "GET") {
      const next = testState.getResponses.shift();
      return next instanceof Promise ? await next : next;
    }
    if (args.url.endsWith("/onboard-session")) return testState.onboardResponse;
    return testState.commandResponse;
  },
}));

vi.mock("../onboard/CheckOnboardModal", () => ({
  CheckOnboardModal: (props: { requestSession: () => Promise<{ link: string; expiresAt?: string }>; onRefetch: () => void }) => {
    testState.modalProps = props;
    return <button type="button" onClick={() => void props.requestSession()}>Continue secure setup</button>;
  },
}));

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
    testState.onboardResponse = { data: { url: "https://onboard.example/session", expiresAt: "2099-01-01T00:00:00.000Z" } };
    testState.modalProps = null;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "payroll-action-uuid") });
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps a missing identity closed with no setup or mutation request", async () => {
    renderPayroll({ payrollScope: { ...scope, employmentId: "" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/not available/i);
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
    expect(await screen.findByRole("status", { name: /loading payroll setup/i })).toHaveAttribute("aria-busy", "true");
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
    expect(screen.getByRole("button", { name: "Retry payroll setup" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Start payroll setup" })).not.toBeInTheDocument();
  });

  it("shows progress for queue states and polls exactly once every five seconds while focused", async () => {
    vi.useFakeTimers();
    testState.getResponses.push(readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })), readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })));
    const view = renderPayroll();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole("status", { name: /payroll setup is in progress/i })).toBeVisible();
    expect(getRequests()).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(getRequests()).toHaveLength(2);
    view.rerender(<Provider store={view.store}><MyPayrollTab scope={scope} active={false} /></Provider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(getRequests()).toHaveLength(2);
    view.unmount();
  });

  it("sends one command with one generated key, relies on invalidation refresh, and blocks double click", async () => {
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection({ setup: { state: "queued", blockers: [], onboardingStatus: null, blockingStepCodes: [], remainingStepCodes: [] } })));
    const user = userEvent.setup();
    renderPayroll();
    const button = await screen.findByRole("button", { name: "Start payroll setup" });
    await user.dblClick(button);
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    expect(commandRequests()[0].headers).toEqual({ "Idempotency-Key": "payroll-action-uuid" });
    await screen.findByRole("status", { name: /payroll setup is in progress/i });
    expect(getRequests()).toHaveLength(2);
  });

  it("performs one explicit refetch for a 409 command conflict", async () => {
    testState.getResponses.push(readyResponse(projection()), readyResponse(projection()));
    testState.commandResponse = { error: { status: 409, data: "stale" } };
    const user = userEvent.setup();
    renderPayroll();
    await user.click(await screen.findByRole("button", { name: "Start payroll setup" }));
    await waitFor(() => expect(commandRequests()).toHaveLength(1));
    await waitFor(() => expect(getRequests()).toHaveLength(2));
  });

  it("defers onboarding session requests until Continue and coalesces Onboard event bursts", async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    testState.getResponses.push(
      readyResponse(projection({ setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] } })),
      new Promise((resolve) => { resolveFirst = resolve; }),
      new Promise((resolve) => { resolveSecond = resolve; }),
    );
    const user = userEvent.setup();
    renderPayroll();
    expect(await screen.findByRole("button", { name: "Continue secure setup" })).toBeVisible();
    expect(sessionRequests()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Continue secure setup" }));
    expect(sessionRequests()).toHaveLength(1);
    expect(testState.modalProps).not.toBeNull();
    act(() => {
      testState.modalProps?.onRefetch();
      testState.modalProps?.onRefetch();
      testState.modalProps?.onRefetch();
    });
    await waitFor(() => expect(getRequests()).toHaveLength(2));
    await act(async () => { resolveFirst(readyResponse(projection())); });
    await waitFor(() => expect(getRequests()).toHaveLength(3));
    await act(async () => { resolveSecond(readyResponse(projection())); });
    await waitFor(() => expect(getRequests()).toHaveLength(3));
  });

  it("does not send a queued Onboard refetch after the tab unmounts", async () => {
    let resolveRefetch!: (value: unknown) => void;
    testState.getResponses.push(
      readyResponse(projection({ setup: { state: "ready", blockers: [], onboardingStatus: "blocking", blockingStepCodes: [], remainingStepCodes: [] } })),
      new Promise((resolve) => { resolveRefetch = resolve; }),
    );
    const view = renderPayroll();
    await screen.findByRole("button", { name: "Continue secure setup" });
    act(() => {
      testState.modalProps?.onRefetch();
      testState.modalProps?.onRefetch();
    });
    await waitFor(() => expect(getRequests()).toHaveLength(2));
    view.unmount();
    await act(async () => { resolveRefetch(readyResponse(projection())); });
    expect(getRequests()).toHaveLength(2);
  });
});
