import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyPayrollSetupTab from "../components/AgencyPayrollSetupTab";
import type { AgencyPayrollSetupProjection } from "@/features/payroll/model/types";

const refetch = vi.fn();
const runCommand = vi.fn();
const loadSetup = vi.fn();
const bootstrapSetup = vi.fn();
let setupQuery: { data?: AgencyPayrollSetupProjection; isLoading?: boolean; isFetching?: boolean; error?: unknown; refetch: typeof refetch };

vi.mock("@/features/payroll/api/agencyPayrollEndpoints", () => ({
  useGetAgencyPayrollSetupQuery: () => setupQuery,
  useLazyGetAgencyPayrollSetupQuery: () => [loadSetup],
  useBootstrapAgencyPayrollSetupMutation: () => [bootstrapSetup],
  useLazyGetAgencyPayrollOperationQuery: () => [vi.fn()],
  useLazyGetAgencyPayrollOverviewQuery: () => [vi.fn()],
}));
vi.mock("@/features/payroll/api/payrollCommands", () => ({ useRunAgencyPayrollCommandMutation: () => [runCommand] }));
vi.mock("@/features/payroll/hooks/useProjectionFreshness", () => ({ useProjectionFreshness: () => ({ requireCurrentProjection: vi.fn().mockResolvedValue(true) }) }));

const projection = (capabilities: AgencyPayrollSetupProjection["capabilities"], designatedSignerPresent = false): AgencyPayrollSetupProjection => ({
  projectionRevision: 4,
  integration: { state: "configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes: [] },
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { designatedSignerPresent, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true },
  capabilities,
});

const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" };

const notConfigured = (missingFieldCodes: string[] = ["legalName"]): AgencyPayrollSetupProjection => ({
  projectionRevision: 0,
  integration: { state: "not_configured", environment: "sandbox" },
  preflight: { values: {}, missingFieldCodes },
  readiness: { status: "needs_information", blockers: ["integration_missing"], nextAction: "create_integration" },
  setup: { designatedSignerPresent: false, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
  capabilities: { canView: true, canManage: true, canCreateIntegration: true, canDesignateSigner: false, createCompanyOnboardSession: false },
});

describe("AgencyPayrollSetupTab", () => {
  beforeEach(() => { refetch.mockReset(); runCommand.mockReset(); loadSetup.mockReset(); bootstrapSetup.mockReset(); setupQuery = { error: true, refetch }; });

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
        setup: { designatedSignerPresent: false, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
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
      setup: { designatedSignerPresent: false, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
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
    expect(screen.getByLabelText("EIN")).toBeInTheDocument();
    expect(screen.queryByLabelText(/social security|bank account|withholding/i)).not.toBeInTheDocument();
  });

  it("locks the modal while creating payroll setup and lets successful cache invalidation refresh the setup", async () => {
    const scannedProjection = {
      projectionRevision: 0,
      integration: { state: "not_configured" as const, environment: "sandbox" as const },
      preflight: { values: { legalName: "Able Care LLC" }, missingFieldCodes: ["ein"] },
      readiness: { status: "needs_information" as const, blockers: ["integration_missing"], nextAction: "create_integration" },
      setup: { designatedSignerPresent: false, companyLinked: false, officeWorkplaceLinked: false, payScheduleLinked: false, enrollmentProfileLocked: false },
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
    await user.type(screen.getByLabelText("EIN"), "12-3456789");
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
    await user.type(await screen.findByLabelText("EIN"), "12-3456789");
    await user.click(screen.getByRole("button", { name: /^create payroll setup$/i }));
    const contact = await screen.findByLabelText("Payroll contact name");
    expect(contact).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("EIN")).toHaveValue("12-3456789");
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

  it("renders owner-only self-designation plus management actions while withholding Onboard", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /payroll company setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /designate myself/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh reconciliation/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /onboard|secure setup/i })).not.toBeInTheDocument();
  });

  it("renders Payroll Management actions without signer authority", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.queryByRole("button", { name: /designate myself|clear signer/i })).not.toBeInTheDocument();
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
