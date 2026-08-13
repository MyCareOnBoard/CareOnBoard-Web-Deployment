import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyPayrollSetupTab from "../components/AgencyPayrollSetupTab";
import type { AgencyPayrollSetupProjection } from "@/features/payroll/model/types";

const refetch = vi.fn();
const runCommand = vi.fn();
let setupQuery: { data?: AgencyPayrollSetupProjection; isLoading?: boolean; error?: unknown; refetch: typeof refetch };

vi.mock("@/features/payroll/api/agencyPayrollEndpoints", () => ({
  useGetAgencyPayrollSetupQuery: () => setupQuery,
  useLazyGetAgencyPayrollOperationQuery: () => [vi.fn()],
  useLazyGetAgencyPayrollOverviewQuery: () => [vi.fn()],
}));
vi.mock("@/features/payroll/api/payrollCommands", () => ({ useRunAgencyPayrollCommandMutation: () => [runCommand] }));
vi.mock("@/features/payroll/hooks/useProjectionFreshness", () => ({ useProjectionFreshness: () => ({ requireCurrentProjection: vi.fn().mockResolvedValue(true) }) }));

const projection = (capabilities: AgencyPayrollSetupProjection["capabilities"], designatedSignerPresent = false): AgencyPayrollSetupProjection => ({
  projectionRevision: 4,
  readiness: { status: "ready", blockers: [], nextAction: null },
  setup: { designatedSignerPresent, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true },
  capabilities,
});

const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" };

describe("AgencyPayrollSetupTab", () => {
  beforeEach(() => { refetch.mockReset(); runCommand.mockReset(); setupQuery = { error: true, refetch }; });

  it("offers an accessible retry that refetches setup", async () => {
    const user = userEvent.setup(); render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/i);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renders owner-only self-designation plus management actions while withholding Onboard", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canDesignateSigner: true, createCompanyOnboardSession: false }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByRole("heading", { name: /payroll company setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /designate myself/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh reconciliation/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /onboard|secure setup/i })).not.toBeInTheDocument();
  });

  it("renders Payroll Management actions without signer authority", () => {
    setupQuery = { data: projection({ canView: true, canManage: true, canDesignateSigner: false, createCompanyOnboardSession: false }), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.queryByRole("button", { name: /designate myself|clear signer/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry company sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh reconciliation/i })).toBeInTheDocument();
  });

  it("renders a view-only setup without mutation controls", () => {
    setupQuery = { data: projection({ canView: true, canManage: false, canDesignateSigner: false, createCompanyOnboardSession: false }, true), refetch };
    render(<AgencyPayrollSetupTab scope={scope} />);
    expect(screen.getByText(/signer designated/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
