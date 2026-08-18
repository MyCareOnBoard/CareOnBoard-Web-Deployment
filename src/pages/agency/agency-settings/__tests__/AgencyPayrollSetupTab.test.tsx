import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyPayrollSetupTab from "../components/AgencyPayrollSetupTab";
import type { AgencyPayrollSetupProjection } from "@/features/payroll/model/types";

const refetch = vi.fn();
const runCommand = vi.fn();
const loadSetup = vi.fn();
const bootstrapSetup = vi.fn();
const mocks = vi.hoisted(() => ({ signerSearchTrigger: vi.fn(), newCommandKey: vi.fn() }));
let setupQuery: { data?: AgencyPayrollSetupProjection; isLoading?: boolean; isFetching?: boolean; error?: unknown; refetch: typeof refetch };
const signerCandidatesQuery = { data: { ownerCandidate: { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: false }, staffCandidates: [] }, isLoading: false, isError: false };

vi.mock("@/features/payroll/api/agencyPayrollEndpoints", () => ({
  useGetAgencyPayrollSetupQuery: () => setupQuery,
  useLazyGetAgencyPayrollSetupQuery: () => [loadSetup],
  useBootstrapAgencyPayrollSetupMutation: () => [bootstrapSetup],
  useGetAgencyPayrollSignerCandidatesQuery: () => signerCandidatesQuery,
  useLazyGetAgencyPayrollSignerCandidatesQuery: () => [mocks.signerSearchTrigger, { data: undefined, isFetching: false, isError: false }],
  useLazyGetAgencyPayrollOperationQuery: () => [vi.fn()],
  useLazyGetAgencyPayrollOverviewQuery: () => [vi.fn()],
}));
vi.mock("@/features/payroll/api/payrollCommands", () => ({ useRunAgencyPayrollCommandMutation: () => [runCommand], newIdempotencyKey: mocks.newCommandKey }));
vi.mock("@/features/payroll/hooks/useProjectionFreshness", () => ({ useProjectionFreshness: () => ({ requireCurrentProjection: vi.fn().mockResolvedValue(true) }) }));

const projection = (capabilities: AgencyPayrollSetupProjection["capabilities"], designatedSignerPresent = false, signerCandidate: AgencyPayrollSetupProjection["setup"]["signerCandidate"] = { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: designatedSignerPresent }): AgencyPayrollSetupProjection => ({
  projectionRevision: 4,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { designatedSignerPresent, signerCandidate, designatedSigner: designatedSignerPresent ? signerCandidate : null, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true },
  capabilities,
});

const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" };

const notConfigured = (missingFieldCodes: string[] = ["legalName"]): AgencyPayrollSetupProjection => ({
  projectionRevision: 0,
  integration: { state: "not_configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes },
  readiness: { status: "needs_information", blockers: ["integration_missing"], nextAction: "create_integration" },
  setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
  capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false },
});

describe("AgencyPayrollSetupTab", () => {
  beforeEach(() => { refetch.mockReset(); runCommand.mockReset(); loadSetup.mockReset(); bootstrapSetup.mockReset(); mocks.signerSearchTrigger.mockReset(); mocks.newCommandKey.mockReset(); mocks.newCommandKey.mockReturnValue("00000000-0000-4000-8000-000000000001"); setupQuery = { error: true, refetch }; });

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
        setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
        capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false },
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
      setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
      capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false as const },
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
      setup: { designatedSignerPresent: false, signerCandidate: null, designatedSigner: null, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
      capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false as const },
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
    expect(mocks.signerSearchTrigger).not.toHaveBeenCalled();
    expect(await screen.findByRole("radio", { name: /ada owner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^create payroll setup$/i })).toBeDisabled();
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
    expect(screen.getByRole("alert")).toHaveTextContent(/reselect the signer/i);
    expect(screen.getByRole("checkbox", { name: /selected account is authorized/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Designate selected signer" })).toBeDisabled();
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
});
