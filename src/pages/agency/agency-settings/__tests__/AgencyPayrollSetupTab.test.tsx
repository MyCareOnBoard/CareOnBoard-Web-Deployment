import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyPayrollSetupTab from "../components/AgencyPayrollSetupTab";
import type { AgencyPayrollSetupProjection } from "@/features/payroll/model/types";

const refetch = vi.fn();
const runCommand = vi.fn();
const loadSetup = vi.fn();
const bootstrapSetup = vi.fn();
const createCompanyOnboardSession = vi.fn();
const getOperation = vi.fn();
const getOverview = vi.fn();
const mocks = vi.hoisted(() => ({ signerSearchTrigger: vi.fn(), newCommandKey: vi.fn(), requireCurrentProjection: vi.fn(), createCheckOnboard: vi.fn(), openCheckOnboard: vi.fn(), closeCheckOnboard: vi.fn() }));
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
vi.mock("@/features/payroll/hooks/useProjectionFreshness", () => ({ useProjectionFreshness: () => ({ requireCurrentProjection: mocks.requireCurrentProjection }) }));
vi.mock("@/features/payroll/onboard/loadCheckOnboard", () => ({ loadCheckOnboard: () => Promise.resolve({ create: mocks.createCheckOnboard }) }));

type TestCapabilities = Omit<AgencyPayrollSetupProjection["capabilities"], "canSubmitCompanyImplementation" | "canRetryCompanySync" | "canRefreshCompanyReconciliation"> & Partial<Pick<AgencyPayrollSetupProjection["capabilities"], "canSubmitCompanyImplementation" | "canRetryCompanySync" | "canRefreshCompanyReconciliation">>;
const projection = (capabilities: TestCapabilities, designatedSignerPresent = false, signerCandidate: AgencyPayrollSetupProjection["setup"]["signerCandidate"] = { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: designatedSignerPresent }): AgencyPayrollSetupProjection => ({
  projectionRevision: 4,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { designatedSignerPresent, signerCandidate, designatedSigner: designatedSignerPresent ? signerCandidate : null, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true, signatoryLinked: false },
  capabilities: { canSubmitCompanyImplementation: false, canRetryCompanySync: capabilities.canManage, canRefreshCompanyReconciliation: capabilities.canManage, ...capabilities },
});

const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" };

const notConfigured = (missingFieldCodes: string[] = ["legalName"]): AgencyPayrollSetupProjection => ({
  projectionRevision: 0,
  integration: { state: "not_configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes },
  readiness: { status: "needs_information", blockers: ["integration_missing"], nextAction: "create_integration" },
  setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
  capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
});

describe("AgencyPayrollSetupTab", () => {
  beforeEach(() => { refetch.mockReset(); runCommand.mockReset(); loadSetup.mockReset(); bootstrapSetup.mockReset(); createCompanyOnboardSession.mockReset(); getOperation.mockReset(); getOverview.mockReset(); mocks.signerSearchTrigger.mockReset(); mocks.newCommandKey.mockReset(); mocks.requireCurrentProjection.mockReset(); mocks.createCheckOnboard.mockReset(); mocks.openCheckOnboard.mockReset(); mocks.closeCheckOnboard.mockReset(); mocks.createCheckOnboard.mockReturnValue({ open: mocks.openCheckOnboard, close: mocks.closeCheckOnboard }); mocks.newCommandKey.mockReturnValue("00000000-0000-4000-8000-000000000001"); mocks.requireCurrentProjection.mockResolvedValue(true); setupQuery = { error: true, refetch }; });

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
        setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
        capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
      } as AgencyPayrollSetupProjection,
      refetch,
    };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /set up payroll/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create payroll setup/i })).toBeInTheDocument();
  });

  it("coalesces an explicit fresh scan and opens only the server-reported missing payroll fields", async () => {
    let resolveScan: (value: AgencyPayrollSetupProjection) => void = () => undefined;
    const scannedProjection = {
      projectionRevision: 0,
      integration: { state: "not_configured" as const, environment: "sandbox" as const },
      preflight: { values: { legalName: "Able Care LLC" }, missingFieldCodes: ["ein"] },
      readiness: { status: "needs_information" as const, blockers: ["integration_missing"], nextAction: "create_integration" },
      setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
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
      setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false, signatoryLinked: false },
      capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false as const, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
    } satisfies AgencyPayrollSetupProjection;
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    let resolveBootstrap: () => void = () => undefined;
    bootstrapSetup.mockReturnValue({ unwrap: () => new Promise<void>((resolve) => { resolveBootstrap = resolve; }) });
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
    await act(async () => { resolveBootstrap(); });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("keeps the direct-create status through cache invalidation without flashing the CTA", async () => {
    const scannedProjection = notConfigured([]);
    setupQuery = { data: scannedProjection, refetch };
    loadSetup.mockReturnValue({ unwrap: () => Promise.resolve(scannedProjection) });
    let resolveBootstrap: () => void = () => undefined;
    bootstrapSetup.mockReturnValue({ unwrap: () => new Promise<void>((resolve) => { resolveBootstrap = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("button", { name: /create payroll setup/i }));
    expect(mocks.signerSearchTrigger).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Creating payroll setup…");
    expect(screen.getByTestId("agency-payroll-create-spinner")).toBeInTheDocument();
    expect(screen.queryByText("Scanning agency details…")).not.toBeInTheDocument();
    await act(async () => { resolveBootstrap(); });
    expect(screen.getByRole("status")).toHaveTextContent("Creating payroll setup…");
    expect(screen.queryByRole("button", { name: /^create payroll setup$/i })).not.toBeInTheDocument();
    setupQuery = { isLoading: true, refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("status")).toHaveTextContent("Creating payroll setup…");
    expect(screen.queryByLabelText("Loading payroll setup")).not.toBeInTheDocument();
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    view.rerender(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /payroll company setup/i })).toBeInTheDocument();
  });

  it("shows one visual loader while retaining configured content during refresh", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), isFetching: true, refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("status")).toHaveTextContent("Refreshing payroll setup…");
    expect(screen.getByTestId("agency-payroll-refresh-spinner")).toBeInTheDocument();
    expect(screen.getAllByTestId(/agency-payroll-.*-spinner/)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /payroll company setup/i })).toBeInTheDocument();
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
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
      setupQuery = { data: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: capability === "canRetryCompanySync", canRefreshCompanyReconciliation: capability === "canRefreshCompanyReconciliation" } }, refetch };
      runCommand.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
      const user = userEvent.setup();
      const view = render(<AgencyPayrollSetupTab scope={scope} />);
      await user.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
      expect(getOverview).toHaveBeenCalledWith(scope);
      expect(screen.getByRole("alert")).toHaveTextContent(/review the current setup/i);
      expect(screen.getByRole("alert")).not.toHaveTextContent(/reselect the signer/i);
      view.unmount();
      refetch.mockReset();
      getOverview.mockReset();
      runCommand.mockReset();
    }
  });

  it("ignores a retired non-designate 409 without updating or refreshing the old scope", async () => {
    let rejectCommand: (reason: unknown) => void = () => undefined;
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise((_resolve, reject) => { rejectCommand = reject; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: "Retry company sync" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { rejectCommand({ status: 409 }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
    expect(getOverview).not.toHaveBeenCalled();
    expect(getOperation).not.toHaveBeenCalled();
  });

  it("does not install an old-scope signer watcher after a late successful command", async () => {
    let resolveCommand: (operation: { operationId: string; state: "accepted"; resourceType: "company"; pollAfterMs: number | null }) => void = () => undefined;
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    runCommand.mockReturnValue({ unwrap: () => new Promise((resolve) => { resolveCommand = resolve; }) });
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: "Refresh reconciliation" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledOnce());
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { resolveCommand({ operationId: "late-signer-op", state: "accepted", resourceType: "company", pollAfterMs: 1 }); });
    expect(getOperation).not.toHaveBeenCalled();
  });

  it("keeps the configured signer retry key stable per intent and creates a new key after reselection", async () => {
    mocks.newCommandKey
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
    runCommand.mockReturnValue({ unwrap: () => Promise.resolve({ operationId: "signer-operation" }) });
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(screen.getByRole("radio", { name: /Ada Owner/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(2));
    expect(runCommand.mock.calls[1][0].idempotencyKey).toBe(runCommand.mock.calls[0][0].idempotencyKey);
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("checkbox", { name: /selected account is authorized/i }));
    await user.click(screen.getByRole("button", { name: "Designate selected signer" }));
    await waitFor(() => expect(runCommand).toHaveBeenCalledTimes(3));
    expect(runCommand.mock.calls[2][0].idempotencyKey).not.toBe(runCommand.mock.calls[0][0].idempotencyKey);
  });

  it("renders verified candidate designation plus management actions while withholding Onboard", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /payroll company setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Designate selected signer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh reconciliation/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /onboard|secure setup/i })).not.toBeInTheDocument();
  });

  it("offers Complete payroll onboarding only to the authorized signer", async () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: true }, true), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(await screen.findByRole("button", { name: "Complete payroll onboarding" })).toBeInTheDocument();
  });

  it("redirects the authorized signer to the closed company Onboard URL without embedding it", async () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: true }, true), refetch };
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.resolve({ url: "https://onboard.example/company", expiresAt: new Date(Date.now() + 60_000).toISOString() }) });
    const originalLocation = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, assign } });
    const user = userEvent.setup();
    try {
      render(<AgencyPayrollSetupTab scope={scope} />);
      await user.click(await screen.findByRole("button", { name: "Complete payroll onboarding" }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith("https://onboard.example/company"));
      expect(mocks.createCheckOnboard).not.toHaveBeenCalled();
      expect(mocks.openCheckOnboard).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    }
  });

  it("tells a non-signer manager that the designated signer must complete company onboarding", () => {
    setupQuery = { data: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true), readiness: { status: "needs_attention", blockers: ["company_onboard_blocking"], nextAction: "complete_company_onboard" }, setup: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true).setup, signatoryLinked: true } }, refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByText(/designated payroll signer must complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete payroll onboarding/i })).not.toBeInTheDocument();
  });

  it("refreshes after a stale company Onboard response and waits for a new click", async () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: true }, true), refetch };
    createCompanyOnboardSession.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
    const user = userEvent.setup();
    render(<AgencyPayrollSetupTab scope={scope} />);
    await user.click(await screen.findByRole("button", { name: "Complete payroll onboarding" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(createCompanyOnboardSession).toHaveBeenCalledTimes(1);
    expect(createCompanyOnboardSession).toHaveBeenCalledWith({ ...scope, expectedProjectionRevision: 4 });
  });

  it("renders Payroll Management actions without signer authority", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.queryByRole("button", { name: /designate this account|clear signer/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh reconciliation/i })).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: /refresh reconciliation/i })).not.toBeInTheDocument();
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

  it("does not dispatch a review command when pending freshness resolves after a scope change", async () => {
    let resolveFreshness: (current: boolean) => void = () => undefined;
    setupQuery = { data: { ...projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), readiness: { status: "needs_attention", blockers: ["implementation_needs_attention"], nextAction: "submit_company_implementation" }, capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: true, canRetryCompanySync: false, canRefreshCompanyReconciliation: false } }, refetch };
    mocks.requireCurrentProjection.mockReturnValue(new Promise<boolean>((resolve) => { resolveFreshness = resolve; }));
    const user = userEvent.setup();
    const view = render(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "A" }} />);
    await user.click(screen.getByRole("button", { name: "Submit for Check review" }));
    view.rerender(<AgencyPayrollSetupTab scope={{ ...scope, agencyId: "B" }} />);
    await act(async () => { resolveFreshness(true); });
    expect(runCommand).not.toHaveBeenCalled();
    expect(getOperation).not.toHaveBeenCalled();
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
    expect(screen.getByRole("alert")).toHaveTextContent(/review the updated payroll setup status/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/reselect the signer/i);
    expect(screen.getByText(/signer designated/i)).toBeInTheDocument();
    expect(getOverview).toHaveBeenCalledWith(scope);
  });
});
