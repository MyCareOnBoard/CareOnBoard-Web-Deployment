import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyPayrollSetupTab from "../components/AgencyPayrollSetupTab";
import type { AgencyPayrollSetupProjection, PayrollOperation } from "@/features/payroll/model/types";

const refetch = vi.fn();
const runCommand = vi.fn();
const loadSetup = vi.fn();
const bootstrapSetup = vi.fn();
const createCompanyOnboardSession = vi.fn();
const getOperation = vi.fn();
const getOverview = vi.fn();
const mocks = vi.hoisted(() => ({ signerSearchTrigger: vi.fn(), newCommandKey: vi.fn(), loadCheckOnboard: vi.fn(), createCheckOnboard: vi.fn(), openCheckOnboard: vi.fn(), showCheckOnboard: vi.fn(), closeCheckOnboard: vi.fn() }));
let setupQuery: { data?: AgencyPayrollSetupProjection; isLoading?: boolean; isFetching?: boolean; error?: unknown; refetch: typeof refetch };
const signerCandidatesQuery = { data: { ownerCandidate: { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: false }, staffCandidates: [] }, isLoading: false, isError: false };

vi.mock("@/features/payroll/api/agencyPayrollEndpoints", () => ({
  useGetAgencyPayrollSetupQuery: () => setupQuery,
  useLazyGetAgencyPayrollSetupQuery: () => [loadSetup],
  useBootstrapAgencyPayrollSetupMutation: () => [bootstrapSetup],
  useCreateCompanyOnboardSessionMutation: () => [createCompanyOnboardSession],
  useGetAgencyPayrollSignerCandidatesQuery: () => signerCandidatesQuery,
  useLazyGetAgencyPayrollSignerCandidatesQuery: () => [mocks.signerSearchTrigger, { data: undefined, isFetching: false, isError: false }],
  useLazyGetAgencyPayrollOperationQuery: () => [getOperation],
  useLazyGetAgencyPayrollOverviewQuery: () => [getOverview],
}));
vi.mock("@/features/payroll/api/payrollCommands", () => ({ useRunAgencyPayrollCommandMutation: () => [runCommand], newIdempotencyKey: mocks.newCommandKey }));
vi.mock("@/features/payroll/onboard/loadCheckOnboard", () => ({ loadCheckOnboard: mocks.loadCheckOnboard }));

type TestCapabilities = Omit<AgencyPayrollSetupProjection["capabilities"], "canSubmitCompanyImplementation" | "canRetryCompanySync" | "canRefreshCompanyReconciliation"> & Partial<Pick<AgencyPayrollSetupProjection["capabilities"], "canSubmitCompanyImplementation" | "canRetryCompanySync" | "canRefreshCompanyReconciliation">>;
const projection = (capabilities: TestCapabilities, designatedSignerPresent = false, signerCandidate: AgencyPayrollSetupProjection["setup"]["signerCandidate"] = { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: designatedSignerPresent }, companyOnboardRevision: number | null = null): AgencyPayrollSetupProjection => ({
  projectionRevision: 4,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { companyOnboardRevision, designatedSignerPresent, signerCandidate, designatedSigner: designatedSignerPresent ? signerCandidate : null, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true, signatoryLinked: false },
  capabilities: { canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false, ...capabilities },
});

const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" };
let documentVisibility: DocumentVisibilityState = "visible";
const setDocumentVisibility = (visibility: DocumentVisibilityState) => {
  documentVisibility = visibility;
  document.dispatchEvent(new Event("visibilitychange"));
};

const onboardProjection = ({ capability = false, revision = 3, signerUserUid = scope.actorUid }: { capability?: boolean; revision?: number; signerUserUid?: string } = {}) => {
  const signer = { userUid: signerUserUid, fullName: "Ada Signer", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"c".repeat(64)}`, designated: true };
  return {
    ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: capability }, true, signer, revision),
  } satisfies AgencyPayrollSetupProjection;
};

const notConfigured = (missingFieldCodes: string[] = ["legalName"]): AgencyPayrollSetupProjection => ({
  projectionRevision: 0,
  integration: { state: "not_configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes },
  readiness: { status: "needs_information", blockers: ["integration_missing"], nextAction: "create_integration" },
  setup: { companyOnboardRevision: null, designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
  capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
});

async function completeDirectSetup(returned: AgencyPayrollSetupProjection, renderScope = scope) {
  const initial = notConfigured([]);
  setupQuery = { data: initial, refetch };
  loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(initial) });
  bootstrapSetup.mockReturnValue({ unwrap: () => Promise.resolve(returned) });
  const user = userEvent.setup();
  const view = render(<AgencyPayrollSetupTab scope={renderScope} />);
  await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
  await waitFor(() => expect(bootstrapSetup).toHaveBeenCalledOnce());
  await act(async () => {});
  return { user, view };
}

async function renderAfterIneligibleActivation(actionable: AgencyPayrollSetupProjection, renderScope = scope) {
  setupQuery = { data: { ...actionable, capabilities: { ...actionable.capabilities, canRefreshCompanyReconciliation: false } }, refetch };
  const user = userEvent.setup();
  const view = render(<AgencyPayrollSetupTab scope={renderScope} />);
  await act(async () => {});
  setupQuery = { data: actionable, refetch };
  view.rerender(<AgencyPayrollSetupTab scope={renderScope} />);
  return { user, view };
}

describe("AgencyPayrollSetupTab", () => {
  beforeEach(() => { vi.restoreAllMocks(); documentVisibility = "visible"; vi.spyOn(document, "visibilityState", "get").mockImplementation(() => documentVisibility); refetch.mockReset(); runCommand.mockReset(); loadSetup.mockReset(); bootstrapSetup.mockReset(); createCompanyOnboardSession.mockReset(); getOperation.mockReset(); getOverview.mockReset(); mocks.signerSearchTrigger.mockReset(); mocks.newCommandKey.mockReset(); mocks.loadCheckOnboard.mockReset(); mocks.createCheckOnboard.mockReset(); mocks.openCheckOnboard.mockReset(); mocks.showCheckOnboard.mockReset(); mocks.closeCheckOnboard.mockReset(); mocks.loadCheckOnboard.mockResolvedValue({ create: mocks.createCheckOnboard }); mocks.createCheckOnboard.mockReturnValue({ open: mocks.openCheckOnboard, _show: mocks.showCheckOnboard, close: mocks.closeCheckOnboard }); mocks.newCommandKey.mockReturnValue("00000000-0000-4000-8000-000000000001"); setupQuery = { error: true, refetch }; });

  it("keeps all four stages complete when a ready company can still be manually refreshed", () => {
    const configured = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRefreshCompanyReconciliation: true }, true);
    setupQuery = { data: { ...configured, setup: { ...configured.setup, signatoryLinked: true } }, refetch };
    render(<AgencyPayrollSetupTab scope={scope} active={false} />);

    expect(screen.getByRole("heading", { name: "Agency Payroll Setup" })).toBeInTheDocument();
    expect(screen.getByText("Follow your agency setup from company connection through Check approval.")).toBeInTheDocument();
    expect(screen.getByText("4 of 4 steps complete")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    for (const title of ["Payroll company connection", "Authorized payroll signer", "Company onboarding", "Check review"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("Complete", { selector: "span[aria-live='polite']" })).toBeInTheDocument();
    expect(screen.getByText("Payroll setup complete")).toBeInTheDocument();
    expect(screen.getByText("Your company is ready to run payroll.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Payroll company connection" }).closest("li")).not.toHaveTextContent("Your CareOnboard agency is connected");
    expect(screen.queryByText(/signer designated/i)).not.toBeInTheDocument();
  });

  it("keeps all four stages visible before configuration and marks company connection current", () => {
    setupQuery = { data: notConfigured(), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);

    expect(screen.getByText("0 of 4 steps complete")).toBeInTheDocument();
    const progress = screen.getByLabelText("0 of 4 payroll setup steps complete");
    expect(progress.children).toHaveLength(4);
    for (const segment of progress.children) expect(segment).toHaveClass("bg-[#e5e7eb]");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Create payroll setup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Authorized payroll signer" }).closest("li")).toHaveTextContent("Upcoming");
    expect(screen.getByRole("heading", { name: "Authorized payroll signer" }).closest("li")).not.toHaveTextContent("Select and confirm");
    expect(screen.getAllByText("Create the payroll integration from your agency details.")).toHaveLength(1);
  });

  it("gives unknown readiness and actions precedence over onboarding and review progress", () => {
    const unknown = projection({ canView: true, canManage: false, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true);
    setupQuery = {
      data: { ...unknown, readiness: { status: "future_provider_status", blockers: [], nextAction: "await_implementation_review" } } as unknown as AgencyPayrollSetupProjection,
      refetch,
    };
    const view = render(<AgencyPayrollSetupTab scope={scope} />);

    expect(screen.getAllByRole("heading", { name: "Agency Payroll Setup" })).toHaveLength(1);
    for (const title of ["Company onboarding", "Check review"]) {
      expect(screen.getByRole("heading", { name: title }).closest("li")).toHaveAttribute("role", "alert");
      expect(screen.getByRole("heading", { name: title }).closest("li")).toHaveTextContent("Needs attention");
    }

    setupQuery = {
      data: {
        ...unknown,
        readiness: { status: "ready", blockers: [], nextAction: "future_provider_action" },
        capabilities: { ...unknown.capabilities, canSubmitCompanyImplementation: true },
      } as unknown as AgencyPayrollSetupProjection,
      refetch,
    };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    for (const title of ["Company onboarding", "Check review"]) {
      expect(screen.getByRole("heading", { name: title }).closest("li")).toHaveAttribute("role", "alert");
      expect(screen.getByRole("heading", { name: title }).closest("li")).toHaveTextContent("Needs attention");
    }
    expect(screen.queryByText("4 of 4 steps complete")).not.toBeInTheDocument();
  });

  it("maps existing setup and provider-support next actions without treating ordinary states as unknown", () => {
    const base = projection({ canView: true, canManage: false, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false });
    setupQuery = { data: { ...base, readiness: { status: "needs_information", blockers: ["missing_required_information"], nextAction: "complete_setup" } }, refetch };
    const view = render(<AgencyPayrollSetupTab scope={scope} />);

    expect(screen.getByRole("heading", { name: "Company onboarding" }).closest("li")).toHaveTextContent("Upcoming");
    expect(screen.getByRole("heading", { name: "Company onboarding" }).closest("li")).not.toHaveAttribute("role", "alert");

    setupQuery = { data: { ...base, readiness: { status: "ready_to_sync", blockers: [], nextAction: "sync_company" } }, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: "Company onboarding" }).closest("li")).toHaveTextContent("Upcoming");
    expect(screen.getByRole("heading", { name: "Company onboarding" }).closest("li")).not.toHaveAttribute("role", "alert");

    for (const nextAction of ["contact_support", "update_ein"]) {
      setupQuery = { data: { ...base, readiness: { status: "needs_attention", blockers: [nextAction === "update_ein" ? "ein_verification_rejected" : "company_not_in_good_standing"], nextAction } }, refetch };
      view.rerender(<AgencyPayrollSetupTab scope={scope} />);
      expect(screen.getByRole("heading", { name: "Company onboarding" }).closest("li")).toHaveAttribute("role", "alert");
      expect(screen.getByRole("heading", { name: "Company onboarding" }).closest("li")).toHaveTextContent("Needs attention");
    }
  });

  it("reconciles once per active scope activation without focus, visibility, or rerender repeats", async () => {
    const configured = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRefreshCompanyReconciliation: true });
    setupQuery = { data: configured, refetch };
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(configured) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve(configured) });
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "activation-op", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    const view = render(<AgencyPayrollSetupTab scope={scope} active />);

    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(1));
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    window.dispatchEvent(new Event("focus"));
    act(() => setDocumentVisibility("hidden"));
    act(() => setDocumentVisibility("visible"));
    await act(async () => {});
    expect(runCommand).toHaveBeenCalledTimes(1);

    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(2));

    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "b" }} active />);
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(3));
  });

  it("resumes a projected operation without posting and hydrates both projections once", async () => {
    const configured = {
      ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRefreshCompanyReconciliation: true }),
      activeOperation: { operationId: "projected-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 },
    } satisfies AgencyPayrollSetupProjection;
    setupQuery = { data: configured, refetch };
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "projected-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(configured) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<AgencyPayrollSetupTab scope={scope} />);

    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "projected-operation" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(runCommand).not.toHaveBeenCalled();
    expect(getOverview).toHaveBeenCalledOnce();
  });

  it("skips operation polling for a terminal POST and hydrates both projections once", async () => {
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true });
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "terminal-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(actionable) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const { user } = await renderAfterIneligibleActivation(actionable);

    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(getOperation).not.toHaveBeenCalled();
    expect(getOverview).toHaveBeenCalledOnce();
  });

  it("defers activation behind command acceptance and consumes it after acceptance", async () => {
    let resolveCommand: (operation: PayrollOperation) => void = () => undefined;
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    setupQuery = { data: { ...actionable, capabilities: { ...actionable.capabilities, canRefreshCompanyReconciliation: false } }, refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise<PayrollOperation>((resolve) => { resolveCommand = resolve; }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "accepted-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(actionable) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    setupQuery = { data: actionable, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => { resolveCommand({ operationId: "accepted-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });

    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it("resumes an operation whose acceptance arrives while the tab is inactive", async () => {
    let resolveCommand: (operation: PayrollOperation) => void = () => undefined;
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    setupQuery = { data: { ...actionable, capabilities: { ...actionable.capabilities, canRefreshCompanyReconciliation: false } }, refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise<PayrollOperation>((resolve) => { resolveCommand = resolve; }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "accepted-while-inactive", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(actionable) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    await act(async () => { resolveCommand({ operationId: "accepted-while-inactive", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    expect(getOperation).not.toHaveBeenCalled();

    setupQuery = { data: actionable, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "accepted-while-inactive" }));
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it("hydrates a terminal acceptance after reactivation without polling or preemptive recovery", async () => {
    let resolveCommand: (operation: PayrollOperation) => void = () => undefined;
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true });
    setupQuery = { data: actionable, refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise<PayrollOperation>((resolve) => { resolveCommand = resolve; }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(actionable) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    await act(async () => { resolveCommand({ operationId: "terminal-while-inactive", state: "succeeded", resourceType: "company", pollAfterMs: null }); });

    expect(getOperation).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
    expect(getOverview).not.toHaveBeenCalled();
    expect(screen.queryByText(/payroll status refresh is required/i)).not.toBeInTheDocument();

    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(getOverview).toHaveBeenCalledOnce();
    expect(getOperation).not.toHaveBeenCalled();
    expect(runCommand).toHaveBeenCalledOnce();
    expect(screen.queryByText(/payroll status refresh is required/i)).not.toBeInTheDocument();
  });

  it("resumes the same accepted operation after the tab deactivates during polling", async () => {
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    setupQuery = { data: { ...actionable, capabilities: { ...actionable.capabilities, canRefreshCompanyReconciliation: false } }, refetch };
    runCommand
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "accepted-before-inactive", state: "accepted", resourceType: "company", pollAfterMs: 1 }) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "unexpected-reconciliation", state: "accepted", resourceType: "company", pollAfterMs: 1 }) });
    getOperation
      .mockReturnValueOnce({ unwrap: () => new Promise<PayrollOperation>(() => undefined) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "accepted-before-inactive", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(actionable) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "accepted-before-inactive" }));

    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    setupQuery = { data: actionable, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);

    await waitFor(() => expect(getOperation).toHaveBeenCalledTimes(2));
    expect(getOperation.mock.calls[1][0]).toEqual({ ...scope, operationId: "accepted-before-inactive" });
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it("lets a deferred activation reconcile once after a pre-acceptance failure", async () => {
    let rejectCommand: (reason: unknown) => void = () => undefined;
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    setupQuery = { data: { ...actionable, capabilities: { ...actionable.capabilities, canRefreshCompanyReconciliation: false } }, refetch };
    runCommand
      .mockReturnValueOnce({ unwrap: () => new Promise((_resolve, reject) => { rejectCommand = reject; }) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "activation-terminal", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(actionable) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    setupQuery = { data: actionable, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    await act(async () => { rejectCommand(new Error("pre-acceptance failure")); });

    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(2));
    expect(runCommand.mock.calls[1][0].command).toBe("refresh_company_reconciliation");
  });

  it("recovers one stale reconciliation with only Setup and a fresh retry key", async () => {
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRefreshCompanyReconciliation: true });
    const fresh = { ...actionable, projectionRevision: 9 };
    mocks.newCommandKey.mockReturnValueOnce("00000000-0000-4000-8000-000000000001").mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    runCommand
      .mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { code: "PROJECTION_STALE" } }) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "fresh-terminal", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    let resolveFresh: (projection: AgencyPayrollSetupProjection) => void = () => undefined;
    loadSetup.mockReturnValue({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveFresh = resolve; }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(fresh) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const { user } = await renderAfterIneligibleActivation(actionable);

    await user.click(screen.getByRole("button", { name: "Refresh payroll status" }));
    await waitFor(() => expect(loadSetup).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeDisabled();
    await act(async () => { resolveFresh(fresh); });
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(2));
    expect(loadSetup).toHaveBeenCalledOnce();
    expect(loadSetup).toHaveBeenCalledWith(scope, false);
    expect(runCommand.mock.calls[0][0].idempotencyKey).not.toBe(runCommand.mock.calls[1][0].idempotencyKey);
    expect(refetch).toHaveBeenCalledOnce();
    expect(getOverview).toHaveBeenCalledOnce();
  });

  it("retains the cached journey and offers inline recovery when a background Setup read fails", async () => {
    const cached = projection({ canView: true, canManage: false, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true);
    setupQuery = { data: cached, error: new Error("background refresh failed"), refetch };
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);

    expect(screen.getByRole("heading", { name: "Agency Payroll Setup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check review" })).toBeInTheDocument();
    expect(screen.getByText(/last available status is still shown/i).closest("[role='alert']")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("offers an accessible retry that refetches setup", async () => {
    const user = userEvent.setup(); render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/i);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows a focused agency bootstrap state and creation action when no integration exists", () => {
    setupQuery = {
      data: {
        projectionRevision: 0,
        integration: { state: "not_configured", environment: "sandbox" },
        preflight: { values: {}, missingFieldCodes: ["legalName"] },
        readiness: { status: "needs_information", blockers: ["integration_missing"], nextAction: "create_integration" },
        setup: { companyOnboardRevision: null, designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
        capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
      } as AgencyPayrollSetupProjection,
      refetch,
    };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /agency payroll setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create payroll setup/i })).toBeInTheDocument();
  });

  it("keeps signer selection inside bootstrap until the integration is configured", async () => {
    const initial = {
      ...notConfigured(["ein"]),
      setup: { ...notConfigured(["ein"]).setup, signerCandidate: signerCandidatesQuery.data.ownerCandidate },
      capabilities: { ...notConfigured(["ein"]).capabilities, canDesignateSigner: true },
    } satisfies AgencyPayrollSetupProjection;
    setupQuery = { data: initial, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(initial) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);

    const signerStep = screen.getByRole("heading", { name: "Authorized payroll signer" }).closest("li");
    expect(signerStep).toHaveTextContent("Upcoming");
    expect(signerStep).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("radio", { name: /Ada Owner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Designate selected signer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create payroll setup" }));
    expect(await screen.findByRole("dialog", { name: /complete payroll setup/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Ada Owner/i })).toBeInTheDocument();
  });

  it("coalesces an explicit fresh scan and opens only the server-reported missing payroll fields", async () => {
    let resolveScan: (value: AgencyPayrollSetupProjection) => void = () => undefined;
    const scannedProjection = {
      projectionRevision: 0,
      integration: { state: "not_configured" as const, environment: "sandbox" as const },
      preflight: { values: { legalName: "Able Care LLC" }, missingFieldCodes: ["ein"] },
      readiness: { status: "needs_information" as const, blockers: ["integration_missing"], nextAction: "create_integration" },
      setup: { companyOnboardRevision: null, designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
      capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false as const, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
    } satisfies AgencyPayrollSetupProjection;
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveScan = resolve; }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    const create = screen.getByRole("button", { name: /create payroll setup/i });
    await user.click(create);
    await user.click(create);
    expect(screen.getByRole("status")).toHaveTextContent("Scanning agency details…");
    expect(screen.getByTestId("agency-payroll-scan-spinner")).toBeInTheDocument();
    expect(loadSetup).toHaveBeenCalledTimes(1);
    expect(loadSetup).toHaveBeenCalledWith(scope, false);
    await act(async () => { resolveScan(scannedProjection); });
    expect(await screen.findByRole("dialog", { name: /complete payroll setup/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Employer Identification Number (EIN)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/social security|bank account|withholding/i)).not.toBeInTheDocument();
  });

  it("locks the modal while creating payroll setup and lets successful cache invalidation refresh the setup", async () => {
    const scannedProjection = {
      projectionRevision: 0,
      integration: { state: "not_configured" as const, environment: "sandbox" as const },
      preflight: { values: { legalName: "Able Care LLC" }, missingFieldCodes: ["ein"] },
      readiness: { status: "needs_information" as const, blockers: ["integration_missing"], nextAction: "create_integration" },
      setup: { companyOnboardRevision: null, designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
      capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false as const, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
    } satisfies AgencyPayrollSetupProjection;
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    let resolveBootstrap: (value: AgencyPayrollSetupProjection) => void = () => undefined;
    bootstrapSetup.mockReturnValue({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveBootstrap = resolve; }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await screen.findByRole("dialog", { name: /complete payroll setup/i });
    await user.type(screen.getByLabelText("Employer Identification Number (EIN)"), "12-3456789");
    await user.click(screen.getByRole("button", { name: /^create payroll setup$/i }));
    expect(bootstrapSetup).toHaveBeenCalledWith(expect.objectContaining({
      ...scope,
      expectedProjectionRevision: 0,
      checkPayrollProfile: expect.objectContaining({ einChange: { mode: "replace", value: "12-3456789" } }),
    }));
    expect(screen.getByRole("button", { name: /creating payroll setup/i })).toBeDisabled();
    expect(screen.getByTestId("agency-payroll-modal-create-spinner")).toBeInTheDocument();
    expect(screen.getAllByTestId(/agency-payroll-.*-spinner/)).toHaveLength(1);
    await act(async () => { resolveBootstrap(projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false })); });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("keeps the direct-create status through cache invalidation without flashing the CTA", async () => {
    const scannedProjection = notConfigured([]);
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    let resolveBootstrap: (value: AgencyPayrollSetupProjection) => void = () => undefined;
    bootstrapSetup.mockReturnValue({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveBootstrap = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    expect(mocks.signerSearchTrigger).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Creating payroll setup…");
    expect(screen.getByTestId("agency-payroll-create-spinner")).toBeInTheDocument();
    expect(screen.queryByText("Scanning agency details…")).not.toBeInTheDocument();
    await act(async () => { resolveBootstrap(projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false })); });
    expect(screen.getByRole("status")).toHaveTextContent("Creating payroll setup…");
    expect(screen.queryByRole("button", { name: /^create payroll setup$/i })).not.toBeInTheDocument();
    setupQuery = { isLoading: true, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("status")).toHaveTextContent("Creating payroll setup…");
    expect(screen.queryByLabelText("Loading payroll setup")).not.toBeInTheDocument();
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /agency payroll setup/i })).toBeInTheDocument();
  });

  it("shows one visual loader while retaining configured content during refresh", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), isFetching: true, refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("status")).toHaveTextContent("Refreshing payroll setup…");
    expect(screen.getByTestId("agency-payroll-refresh-spinner")).toBeInTheDocument();
    expect(screen.getAllByTestId(/agency-payroll-.*-spinner/)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /agency payroll setup/i })).toBeInTheDocument();
  });

  it("reports a direct create failure as creation rather than scanning", async () => {
    const scannedProjection = notConfigured([]);
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    bootstrapSetup.mockReturnValue({ unwrap: () => Promise.reject(new Error("create failed")) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be created/i);
    expect(screen.getByRole("button", { name: /^create payroll setup$/i })).toBeEnabled();
  });

  it("maps CHECK_SETUP_INCOMPLETE field codes back into the open modal", async () => {
    const scannedProjection = notConfigured(["ein"]);
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    bootstrapSetup.mockReturnValue({ unwrap: () => Promise.reject({ data: { code: "CHECK_SETUP_INCOMPLETE", missingFieldCodes: ["payrollContact.name"] } }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await user.type(await screen.findByLabelText("Employer Identification Number (EIN)"), "12-3456789");
    await user.click(screen.getByRole("button", { name: /^create payroll setup$/i }));
    const contact = await screen.findByLabelText("Payroll contact’s full name");
    expect(contact).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Employer Identification Number (EIN)")).toHaveValue("12-3456789");
  });

  it("does not let a stale A scan error clear the active B scan", async () => {
    setupQuery = { data: notConfigured(), refetch };
    let rejectA: (reason?: unknown) => void = () => undefined;
    let resolveB: (value: AgencyPayrollSetupProjection) => void = () => undefined;
    loadSetup
      .mockReturnValueOnce({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((_resolve, reject) => { rejectA = reject; }) })
      .mockReturnValueOnce({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveB = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await act(async () => { rejectA(new Error("stale A")); });
    expect(screen.getByRole("status")).toHaveTextContent("Scanning agency details…");
    expect(screen.queryByText(/payroll status refresh is required|payroll command could not be completed/i)).not.toBeInTheDocument();
    await act(async () => { resolveB(notConfigured(["ein"])); });
    expect(await screen.findByRole("dialog", { name: /complete payroll setup/i })).toBeInTheDocument();
  });

  it("does not let an old A generation settle after returning from B to A", async () => {
    setupQuery = { data: notConfigured(), refetch };
    let rejectOldA: (reason?: unknown) => void = () => undefined;
    let resolveNewA: (value: AgencyPayrollSetupProjection) => void = () => undefined;
    loadSetup
      .mockReturnValueOnce({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((_resolve, reject) => { rejectOldA = reject; }) })
      .mockReturnValueOnce({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveNewA = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await act(async () => { rejectOldA(new Error("old A")); });
    expect(screen.getByRole("status")).toHaveTextContent("Scanning agency details…");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => { resolveNewA(notConfigured(["ein"])); });
    expect(await screen.findByRole("dialog", { name: /complete payroll setup/i })).toBeInTheDocument();
  });

  it("uses the exact verified candidate UID for a designated signer command", async () => {
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "operation-1" }) });
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: "I confirm this selected account is authorized to act as the agency's payroll signer." }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    expect(runCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "designate_signer", designatedSignerUserUid: "verified-owner", authorityAttested: true }));
    expect(runCommand.mock.calls[0][0].designatedSignerUserUid).not.toBe(scope.actorUid);
  });

  it("requires owner signer confirmation even when the payroll profile has no missing fields", async () => {
    const ownerReady = {
      ...notConfigured([]),
      setup: { ...notConfigured([]).setup, signerCandidate: signerCandidatesQuery.data.ownerCandidate },
      capabilities: { ...notConfigured([]).capabilities, canDesignateSigner: true },
    };
    setupQuery = { data: ownerReady, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(ownerReady) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    expect(await screen.findByRole("radio", { name: /ada owner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^create payroll setup$/i })).toBeDisabled();
  });

  it("holds owner bootstrap for identity repair when the verified signer candidate is unavailable", async () => {
    const ownerWithoutCandidate = {
      ...notConfigured([]),
      capabilities: { ...notConfigured([]).capabilities, canDesignateSigner: true },
    };
    setupQuery = { data: ownerWithoutCandidate, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(ownerWithoutCandidate) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    expect(await screen.findByRole("dialog", { name: /complete payroll setup/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/only the active agency owner can choose an authorized payroll signer/i);
    expect(screen.getByRole("button", { name: /^create payroll setup$/i })).toBeDisabled();
    expect(bootstrapSetup).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("bootstraps the attested owner in one request without a chained signer command", async () => {
    const scannedProjection = {
      ...notConfigured(["ein"]),
      setup: { ...notConfigured(["ein"]).setup, signerCandidate: signerCandidatesQuery.data.ownerCandidate },
      capabilities: { ...notConfigured(["ein"]).capabilities, canDesignateSigner: true },
    };
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    bootstrapSetup.mockReturnValue({ unwrap: () => Promise.resolve(projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false })) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await user.type(await screen.findByLabelText("Employer Identification Number (EIN)"), "12-3456789");
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: /^create payroll setup$/i }));
    await waitFor(() => expect(bootstrapSetup).toHaveBeenCalledWith(expect.objectContaining({
      expectedProjectionRevision: 0,
      signerDesignation: { designatedSignerUserUid: "verified-owner", designatedSignerIdentityVersion: expect.stringMatching(/^check_signer_v1_/), authorityAttested: true },
    })));
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("clears signer intent after a 409 and requires reselection before retry", async () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    runCommand.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(getOverview).toHaveBeenCalledWith(scope);
    expect(screen.getByRole("alert")).toHaveTextContent(/reselect the signer/i);
    expect(screen.getByRole("checkbox", { name: /selected account is authorized/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Designate selected signer" })).toBeDisabled();
  });

  it("refreshes once with generic current-state guidance after retry and reconciliation conflicts", async () => {
    for (const [capability, label] of [["canRetryCompanySync", "Retry company sync"], ["canRefreshCompanyReconciliation", "Refresh reconciliation"]] as const) {
      const actionable = { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: capability === "canRetryCompanySync", canRefreshCompanyReconciliation: capability === "canRefreshCompanyReconciliation" } } satisfies AgencyPayrollSetupProjection;
      runCommand.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
      let user: ReturnType<typeof userEvent.setup>;
      let view: ReturnType<typeof render>;
      if (capability === "canRefreshCompanyReconciliation") ({ user, view } = await renderAfterIneligibleActivation(actionable));
      else {
        setupQuery = { data: actionable, refetch };
        user = userEvent.setup();
        view = render(<AgencyPayrollSetupTab scope={scope} />);
      }
      await user.click(screen.getByRole("button", { name: label === "Refresh reconciliation" ? "Refresh payroll status" : label }));
      await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
      if (capability === "canRetryCompanySync") {
        await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
        expect(getOverview).toHaveBeenCalledWith(scope);
      } else {
        expect(refetch).not.toHaveBeenCalled();
        expect(getOverview).not.toHaveBeenCalled();
      }
      const conflict = screen.getByText(/payroll setup changed\. Review the current setup and try again\.|payroll command could not be completed\. Review the current setup and try again\./i);
      expect(conflict).toHaveAttribute("role", "alert");
      expect(conflict).not.toHaveTextContent(/reselect the signer/i);
      view.unmount();
      refetch.mockReset();
      getOverview.mockReset();
      runCommand.mockReset();
    }
  });

  it("serializes a pending retry before company review submission and announces the active command", async () => {
    let resolveCommand: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    let resolveSetupRefresh: () => void = () => undefined;
    let resolveOverviewRefresh: () => void = () => undefined;
    const actionable = {
        ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }),
        readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" },
        capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: true, canRefreshCompanyReconciliation: true },
      } as AgencyPayrollSetupProjection;
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveCommand = resolve; }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "retry-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue(new Promise<void>((resolve) => { resolveSetupRefresh = resolve; }));
    getOverview.mockReturnValue(new Promise<void>((resolve) => { resolveOverviewRefresh = resolve; }));
    const { user } = await renderAfterIneligibleActivation(actionable);

    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    expect(screen.getByRole("status", { name: "Retrying company sync" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Submit for Check review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Submit for Check review" }));
    expect(runCommand).toHaveBeenCalledOnce();

    await act(async () => { resolveCommand({ operationId: "retry-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "retry-operation" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    await act(async () => { resolveSetupRefresh(); resolveOverviewRefresh(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit for Check review" })).toBeEnabled());
  });

  it("serializes pending company review submission before reconciliation and releases after refresh", async () => {
    let resolveCommand: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    let resolveSetupRefresh: () => void = () => undefined;
    let resolveOverviewRefresh: () => void = () => undefined;
    const actionable = {
        ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }),
        readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" },
        capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: true, canRefreshCompanyReconciliation: true },
      } as AgencyPayrollSetupProjection;
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveCommand = resolve; }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "submit-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue(new Promise<void>((resolve) => { resolveSetupRefresh = resolve; }));
    getOverview.mockReturnValue(new Promise<void>((resolve) => { resolveOverviewRefresh = resolve; }));
    const { user } = await renderAfterIneligibleActivation(actionable);

    await user.click(screen.getByRole("button", { name: "Submit for Check review" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    expect(screen.getByRole("status", { name: "Submitting company for Check review" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Retry company sync" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Refresh payroll status" }));
    expect(runCommand).toHaveBeenCalledOnce();

    await act(async () => { resolveCommand({ operationId: "submit-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "submit-operation" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    await act(async () => { resolveSetupRefresh(); resolveOverviewRefresh(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeEnabled());
  });

  it("keeps one signer-management command active through its terminal refresh", async () => {
    let resolveCommand: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    let resolveSetupRefresh: () => void = () => undefined;
    let resolveOverviewRefresh: () => void = () => undefined;
    const designatedSigner = { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: true };
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true }, true, designatedSigner);
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveCommand = resolve; }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "retry-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue(new Promise<void>((resolve) => { resolveSetupRefresh = resolve; }));
    getOverview.mockReturnValue(new Promise<void>((resolve) => { resolveOverviewRefresh = resolve; }));
    const { user } = await renderAfterIneligibleActivation(actionable);

    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Retry company sync" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear signer" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Refresh payroll status" }));
    expect(runCommand).toHaveBeenCalledOnce();

    await act(async () => { resolveCommand({ operationId: "retry-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "retry-operation" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(getOverview).toHaveBeenCalledWith(scope);
    await act(async () => { resolveSetupRefresh(); });
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeDisabled();
    await act(async () => { resolveOverviewRefresh(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry company sync" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Clear signer" })).toBeEnabled();
  });

  it("ignores a retired non-designate 409 without updating or refreshing the old scope", async () => {
    let rejectCommand: (reason: unknown) => void = () => undefined;
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true }), refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise((_resolve, reject) => { rejectCommand = reject; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { rejectCommand({ status: 409 }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
    expect(getOverview).not.toHaveBeenCalled();
    expect(getOperation).not.toHaveBeenCalled();
  });

  it("does not install an old-scope signer watcher after a late successful command", async () => {
    let resolveCommand: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRefreshCompanyReconciliation: true }), refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveCommand = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: "Refresh payroll status" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { resolveCommand({ operationId: "late-signer-op", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    expect(getOperation).not.toHaveBeenCalled();
  });

  it("keeps the configured signer retry key stable per intent and creates a new key after reselection", async () => {
    mocks.newCommandKey
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "signer-operation" }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "signer-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Designate selected signer" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(2));
    expect(runCommand.mock.calls[1][0].idempotencyKey).toBe(runCommand.mock.calls[0][0].idempotencyKey);
    await waitFor(() => expect(screen.getByRole("button", { name: "Designate selected signer" })).toBeEnabled());
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(3));
    expect(runCommand.mock.calls[2][0].idempotencyKey).not.toBe(runCommand.mock.calls[0][0].idempotencyKey);
  });

  it("renders verified candidate designation plus management actions while withholding Onboard", async () => {
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    await renderAfterIneligibleActivation(actionable);
    expect(screen.getByRole("heading", { name: /agency payroll setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Designate selected signer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh payroll status/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /onboard|secure setup/i })).not.toBeInTheDocument();
  });

  it("keeps an eligible historical setup manual without auto-opening it", async () => {
    setupQuery = { data: onboardProjection({ capability: true }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(await screen.findByRole("button", { name: "Complete payroll onboarding" })).toBeInTheDocument();
    await act(async () => {});
    expect(createCompanyOnboardSession).not.toHaveBeenCalled();
    expect(mocks.openCheckOnboard).not.toHaveBeenCalled();
  });

  it("opens the authorized signer's company Onboard session in the embedded SDK", async () => {
    setupQuery = { data: onboardProjection({ capability: true }), refetch };
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://onboard.example/company", expiresAt: new Date(Date.now() + 60_000).toISOString() }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(await screen.findByRole("button", { name: "Complete payroll onboarding" }));
    await waitFor(() => expect(mocks.createCheckOnboard).toHaveBeenCalledWith(expect.objectContaining({ link: "https://onboard.example/company" })));
    expect(mocks.openCheckOnboard).toHaveBeenCalledOnce();
    expect(mocks.showCheckOnboard).toHaveBeenCalledOnce();
    expect(createCompanyOnboardSession).toHaveBeenCalledWith({ ...scope, expectedCompanyOnboardRevision: 3 });
  });

  it("refreshes company reconciliation once when agency onboarding genuinely closes", async () => {
    let onClose!: () => void;
    const base = onboardProjection({ capability: true });
    const actionable = { ...base, capabilities: { ...base.capabilities, canRefreshCompanyReconciliation: true } };
    const freshProjection = { ...actionable, projectionRevision: 5 };
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://onboard.example/company", expiresAt: new Date(Date.now() + 60_000).toISOString() }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(freshProjection) });
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "reconcile-close", state: "accepted", resourceType: "company", pollAfterMs: 1 }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "reconcile-close", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    mocks.createCheckOnboard.mockImplementation((options) => {
      onClose = options.onClose;
      return { open: mocks.openCheckOnboard, _show: mocks.showCheckOnboard, close: mocks.closeCheckOnboard };
    });
    const { user } = await renderAfterIneligibleActivation(actionable);

    await user.click(await screen.findByRole("button", { name: "Complete payroll onboarding" }));
    await waitFor(() => expect(onClose).toBeTypeOf("function"));
    act(() => onClose());

    await waitFor(() => expect(runCommand).toHaveBeenCalledWith(expect.objectContaining({
      ...scope,
      command: "refresh_company_reconciliation",
      projectionRevision: 4,
    })));
    expect(runCommand).toHaveBeenCalledOnce();
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "reconcile-close" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(runCommand.mock.invocationCallOrder[0]).toBeLessThan(refetch.mock.invocationCallOrder[0]);
    expect(screen.queryByText(/payroll status refresh is required|payroll command could not be completed/i)).not.toBeInTheDocument();
  });

  it("watches signer-backed bootstrap work and auto-opens only after terminal hydration is actionable", async () => {
    const signerScope = { ...scope, actorUid: "verified-owner" };
    const scanned = {
      ...notConfigured(["ein"]),
      setup: { ...notConfigured(["ein"]).setup, signerCandidate: signerCandidatesQuery.data.ownerCandidate },
      capabilities: { ...notConfigured(["ein"]).capabilities, canDesignateSigner: true },
    };
    const waiting = {
      ...onboardProjection(),
      activeOperation: { operationId: "bootstrap-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 },
    } satisfies AgencyPayrollSetupProjection;
    const eligible = onboardProjection({ capability: true, signerUserUid: signerScope.actorUid });
    setupQuery = { data: scanned, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scanned) });
    bootstrapSetup.mockReturnValue({ unwrap: () => Promise.resolve(waiting) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "bootstrap-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve(eligible) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve(eligible) });
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://onboard.example/automatic", expiresAt: new Date(Date.now() + 60_000).toISOString() }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={signerScope} />);

    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await user.type(await screen.findByLabelText("Employer Identification Number (EIN)"), "12-3456789");
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: /^create payroll setup$/i }));
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...signerScope, operationId: "bootstrap-operation" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(runCommand).not.toHaveBeenCalled();

    setupQuery = { data: eligible, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={signerScope} />);
    await waitFor(() => expect(mocks.openCheckOnboard).toHaveBeenCalledOnce());
    expect(createCompanyOnboardSession).toHaveBeenCalledOnce();
  });

  it("does not auto-open a post-bootstrap reconciliation after the tab was inactive", async () => {
    const signerScope = { ...scope, actorUid: "verified-owner" };
    const scanned = {
      ...notConfigured(["ein"]),
      setup: { ...notConfigured(["ein"]).setup, signerCandidate: signerCandidatesQuery.data.ownerCandidate },
      capabilities: { ...notConfigured(["ein"]).capabilities, canDesignateSigner: true },
    };
    const waiting = {
      ...onboardProjection({ signerUserUid: signerScope.actorUid }),
      activeOperation: { operationId: "bootstrap-before-reconcile", state: "accepted", resourceType: "company", pollAfterMs: 1 },
    } satisfies AgencyPayrollSetupProjection;
    const needsReconciliation = {
      ...onboardProjection({ signerUserUid: signerScope.actorUid }),
      readiness: { status: "ready_to_sync" as const, blockers: [], nextAction: "sync_company" },
      capabilities: { ...onboardProjection({ signerUserUid: signerScope.actorUid }).capabilities, canRefreshCompanyReconciliation: true },
    } satisfies AgencyPayrollSetupProjection;
    const eligible = onboardProjection({ capability: true, signerUserUid: signerScope.actorUid });
    setupQuery = { data: scanned, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scanned) });
    bootstrapSetup.mockReturnValue({ unwrap: () => Promise.resolve(waiting) });
    getOperation
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "bootstrap-before-reconcile", state: "succeeded", resourceType: "company", pollAfterMs: null }) })
      .mockReturnValueOnce({ unwrap: () => new Promise<PayrollOperation>(() => undefined) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ operationId: "post-bootstrap-reconcile", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch
      .mockReturnValueOnce({ unwrap: () => Promise.resolve(needsReconciliation) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve(eligible) });
    getOverview.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "post-bootstrap-reconcile", state: "accepted", resourceType: "company", pollAfterMs: 1 }) });
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://onboard.example/stale", expiresAt: new Date(Date.now() + 60_000).toISOString() }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={signerScope} active />);

    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await user.type(await screen.findByLabelText("Employer Identification Number (EIN)"), "12-3456789");
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: /^create payroll setup$/i }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    await waitFor(() => expect(getOperation).toHaveBeenCalledTimes(2));

    view.rerender(<AgencyPayrollSetupTab scope={signerScope} active={false} />);
    setupQuery = { data: eligible, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={signerScope} active />);

    await waitFor(() => expect(getOperation).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId("agency-payroll-command-spinner")).not.toBeInTheDocument());
    expect(screen.queryByText(/preparing payroll onboarding/i)).not.toBeInTheDocument();
    expect(createCompanyOnboardSession).not.toHaveBeenCalled();
    expect(mocks.openCheckOnboard).not.toHaveBeenCalled();
  });

  it("keeps signerless bootstrap manual without watching or auto-opening", async () => {
    const eligible = onboardProjection({ capability: true });
    const { view } = await completeDirectSetup(eligible);
    setupQuery = { data: eligible, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);

    expect(await screen.findByRole("button", { name: "Complete payroll onboarding" })).toBeEnabled();
    expect(getOperation).not.toHaveBeenCalled();
    expect(createCompanyOnboardSession).not.toHaveBeenCalled();
    expect(mocks.openCheckOnboard).not.toHaveBeenCalled();
  });

  it("retires a late setup success when scope A changes before it resolves", async () => {
    let resolveSetup!: (value: AgencyPayrollSetupProjection) => void;
    const initial = notConfigured([]);
    setupQuery = { data: initial, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(initial) });
    bootstrapSetup.mockReturnValue({ unwrap: () => new Promise<AgencyPayrollSetupProjection>((resolve) => { resolveSetup = resolve; }) });
    const user = userEvent.setup();
    const scopeA = { ...scope, agencyId: "A" };
    const scopeB = { ...scope, agencyId: "B" };
    const view = render(<AgencyPayrollSetupTab scope={scopeA} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    await waitFor(() => expect(bootstrapSetup).toHaveBeenCalledOnce());
    setupQuery = { data: onboardProjection({ capability: true }), refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scopeB} />);
    await act(async () => { resolveSetup(onboardProjection()); });
    expect(createCompanyOnboardSession).not.toHaveBeenCalled();
    expect(mocks.openCheckOnboard).not.toHaveBeenCalled();
  });

  it("does not close an opened onboarding session when the document becomes hidden", async () => {
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://onboard.example/open", expiresAt: new Date(Date.now() + 60_000).toISOString() }) });
    setupQuery = { data: onboardProjection({ capability: true }), refetch };
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(await screen.findByRole("button", { name: "Complete payroll onboarding" }));
    await waitFor(() => expect(mocks.openCheckOnboard).toHaveBeenCalledOnce());
    act(() => setDocumentVisibility("hidden"));
    expect(mocks.closeCheckOnboard).not.toHaveBeenCalled();
  });

  it("tells a non-signer manager that the designated signer must complete company onboarding", () => {
    setupQuery = { data: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true), readiness: { status: "needs_attention", blockers: ["company_onboard_blocking"], nextAction: "complete_company_onboard" }, setup: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true).setup, signatoryLinked: true } }, refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByText(/designated payroll signer must complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete payroll onboarding/i })).not.toBeInTheDocument();
  });

  it("refreshes after a stale company Onboard response and waits for a new click", async () => {
    setupQuery = { data: onboardProjection({ capability: true }), refetch };
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(await screen.findByRole("button", { name: "Complete payroll onboarding" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(createCompanyOnboardSession).toHaveBeenCalledTimes(1);
    expect(createCompanyOnboardSession).toHaveBeenCalledWith({ ...scope, expectedCompanyOnboardRevision: 3 });
  });

  it("renders Payroll Management actions without signer authority", async () => {
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    await renderAfterIneligibleActivation(actionable);
    expect(screen.queryByRole("button", { name: /designate this account|clear signer/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh payroll status/i })).toBeInTheDocument();
  });

  it("renders a view-only setup without mutation controls", () => {
    setupQuery = { data: projection({ canView: true, canManage: false, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByText(/signer designated/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers review submission from its explicit capability without unrelated company controls", () => {
    setupQuery = {
      data: {
        ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }),
        readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" },
        capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
      } as AgencyPayrollSetupProjection,
      refetch,
    };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("button", { name: "Submit for Check review" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete payroll onboarding/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry company sync/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh payroll status/i })).not.toBeInTheDocument();
  });

  it("locks a review submission, polls its operation, and refreshes both projections on settlement", async () => {
    let resolveSubmit: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    let resolveRefresh: () => void = () => undefined;
    setupQuery = {
      data: {
        ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }),
        readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" },
        capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
      } as AgencyPayrollSetupProjection,
      refetch,
    };
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveSubmit = resolve; }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "review-op", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue(new Promise<void>((resolve) => { resolveRefresh = resolve; }));
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} />);
    const submit = screen.getByRole("button", { name: "Submit for Check review" });
    await user.click(submit);
    await user.click(submit);
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /submitting for review/i })).toBeDisabled();
    expect(screen.getAllByTestId(/agency-payroll-.*-spinner/)).toHaveLength(1);
    await act(async () => { resolveSubmit({ operationId: "review-op", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    setupQuery = { ...setupQuery, isFetching: true };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getAllByTestId(/agency-payroll-.*-spinner/)).toHaveLength(1);
    expect(screen.getByTestId("agency-payroll-submit-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("agency-payroll-refresh-spinner")).not.toBeInTheDocument();
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "review-op" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(getOverview).toHaveBeenCalledWith(scope);
    expect(screen.getByRole("button", { name: /submitting for review/i })).toBeDisabled();
    await act(async () => { resolveRefresh(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit for Check review" })).toBeEnabled());
  });

  it("does not install an operation watcher when a pending review command resolves after a scope change", async () => {
    let resolveCommand: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    setupQuery = { data: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" }, capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: false, canRefreshCompanyReconciliation: false } }, refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveCommand = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: "Submit for Check review" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { resolveCommand({ operationId: "late-op", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    expect(getOperation).not.toHaveBeenCalled();
  });

  it("refreshes stale review submission state without clearing signer details or giving signer guidance", async () => {
    const signer = { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: true };
    setupQuery = {
      data: {
        ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true, signer),
        readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" },
        capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
      } as AgencyPayrollSetupProjection,
      refetch,
    };
    runCommand.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: "Submit for Check review" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    const conflict = screen.getByText(/review the updated payroll setup status/i);
    expect(conflict).toHaveAttribute("role", "alert");
    expect(conflict).not.toHaveTextContent(/reselect the signer/i);
    expect(screen.getByText(/signer designated/i)).toBeInTheDocument();
    expect(getOverview).toHaveBeenCalledWith(scope);
  });

  it("keeps every payroll command locked until a failed terminal refresh is retried successfully", async () => {
    let resolveRefresh: () => void = () => undefined;
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true, canRefreshCompanyReconciliation: true });
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "retry-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "retry-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValueOnce({ unwrap: () => Promise.resolve({}) }).mockReturnValueOnce({ unwrap: () => new Promise<void>((resolve) => { resolveRefresh = resolve; }) });
    getOverview.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error("overview refresh failed")) }).mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const { user, view } = await renderAfterIneligibleActivation(actionable);

    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, operationId: "retry-operation" }));
    await waitFor(() => expect(screen.getByText(/payroll status refresh is required/i).closest("[role='alert']")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry company sync" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh payroll status" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /retry status refresh/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Refresh payroll status" }));
    expect(runCommand).toHaveBeenCalledOnce();

    view.rerender(<AgencyPayrollSetupTab scope={scope} active={false} />);
    view.rerender(<AgencyPayrollSetupTab scope={scope} active />);
    expect(screen.getByRole("button", { name: /retry status refresh/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /retry status refresh/i }));
    expect(screen.getByRole("button", { name: "Retry company sync" })).toBeDisabled();
    await act(async () => { resolveRefresh(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry company sync" })).toBeEnabled());
  });

  it("ignores a terminal refresh failure after its command scope retires", async () => {
    let rejectOverview: (reason: unknown) => void = () => undefined;
    const actionable = projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canRetryCompanySync: true });
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "scope-operation", state: "accepted", resourceType: "company", pollAfterMs: 1 }) });
    getOperation.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "scope-operation", state: "succeeded", resourceType: "company", pollAfterMs: null }) });
    refetch.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    getOverview.mockReturnValue({ unwrap: () => new Promise((_resolve, reject) => { rejectOverview = reject; }) });
    const { user, view } = await renderAfterIneligibleActivation(actionable, { ...scope, agencyId: "A" });
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(getOperation).toHaveBeenCalledWith({ ...scope, agencyId: "A", operationId: "scope-operation" }));
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { rejectOverview(new Error("old scope refresh failed")); });
    expect(screen.queryByText(/payroll status refresh is required/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry status refresh/i })).not.toBeInTheDocument();
  });
});
