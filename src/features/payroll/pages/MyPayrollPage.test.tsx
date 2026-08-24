import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MyPayrollPage } from "./MyPayrollPage";

const useAuth = vi.hoisted(() => vi.fn());
const usePayStatements = vi.hoisted(() => vi.fn());
const useLazyPayStatements = vi.hoisted(() => vi.fn());
const loadMore = vi.hoisted(() => vi.fn());
const download = vi.hoisted(() => vi.fn());
vi.mock("@/utils/auth", () => ({ useAuth }));
vi.mock("../api/employeePayrollEndpoints", () => ({
  useGetEmployeePayStatementsQuery: usePayStatements,
  useLazyGetEmployeePayStatementsQuery: useLazyPayStatements,
  downloadEmployeePayStatementPdf: download,
}));

const statement = {
  statementId: "statement-1", periodStart: "2026-06-01", periodEnd: "2026-06-14", payDate: "2026-06-20", status: "paid" as const,
  grossPayCents: 120_000, deductionsCents: 30_000, netPayCents: 90_000,
  earnings: [], reimbursements: [], taxes: [], otherDeductions: [], paymentMethod: "direct_deposit" as const, downloadAvailable: true,
};
const data = (overrides: Partial<Record<string, unknown>> = {}) => ({
  setupRequired: false, year: new Date().getUTCFullYear(), currency: "USD" as const,
  summary: { yearToDateGrossCents: 120_000, latestNetPayCents: 90_000, latestPayDate: "2026-06-20", nextPayDate: "2026-06-27", nextPayStatus: "processing" as const },
  statements: [statement], nextCursor: "cursor-2", ...overrides,
});

describe("MyPayrollPage", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: { uid: "user-1", agencyId: "agency-1", payrollEmploymentId: "employment-1", userType: "employee" } });
    usePayStatements.mockReturnValue({ currentData: data(), isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
    useLazyPayStatements.mockReturnValue([loadMore, { isFetching: false, isError: false, originalArgs: undefined }]);
    loadMore.mockReset();
    download.mockReset();
  });

  it("queries the employee or agency-staff self scope without rendering stale data for a new year", async () => {
    const view = render(<MyPayrollPage />);
    expect(usePayStatements).toHaveBeenLastCalledWith(expect.objectContaining({ audience: "employee", actorUid: "user-1", agencyId: "agency-1", employmentId: "employment-1" }));
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/year/i), String(new Date().getUTCFullYear() - 1));
    expect(usePayStatements).toHaveBeenLastCalledWith(expect.objectContaining({ year: new Date().getUTCFullYear() - 1 }));

    useAuth.mockReturnValue({ user: { uid: "staff-1", agencyId: "agency-1", payrollEmploymentId: "staff-employment-1", userType: "agency_staff" } });
    view.rerender(<MyPayrollPage />);
    expect(usePayStatements).toHaveBeenLastCalledWith(expect.objectContaining({ actorUid: "staff-1", employmentId: "staff-employment-1" }));

    useAuth.mockReturnValue({ user: { uid: "staff-2", agencyId: "", agency: { id: "agency-2" }, payrollEmploymentId: "staff-employment-2", userType: "agency_staff" } });
    view.rerender(<MyPayrollPage />);
    expect(usePayStatements).toHaveBeenLastCalledWith(expect.objectContaining({ actorUid: "staff-2", agencyId: "agency-2", employmentId: "staff-employment-2" }));
  });

  it("skips unavailable payroll setup and gives each role its correct setup link", () => {
    useAuth.mockReturnValue({ user: { uid: "user-1", agencyId: "agency-1", userType: "employee" } });
    const view = render(<MemoryRouter><MyPayrollPage /></MemoryRouter>);
    expect(screen.getByText(/payroll is not available/i)).toBeVisible();
    expect(usePayStatements.mock.calls.at(-1)?.[0]).toBeDefined();

    usePayStatements.mockReturnValue({ currentData: data({ setupRequired: true }), isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
    useAuth.mockReturnValue({ user: { uid: "staff-1", agencyId: "agency-1", payrollEmploymentId: "staff-employment-1", userType: "agency_staff" } });
    view.rerender(<MemoryRouter><MyPayrollPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /complete payroll setup/i })).toHaveAttribute("href", "/agency/agency-settings?tab=myPayroll");
  });

  it("renders loading, empty, error, summary, and guarded load-more states", async () => {
    usePayStatements.mockReturnValue({ currentData: undefined, isLoading: true, isFetching: true, isError: false, refetch: vi.fn() });
    const view = render(<MyPayrollPage />);
    expect(screen.getAllByTestId("payroll-summary-skeleton")).toHaveLength(3);
    expect(screen.getAllByTestId("payroll-row-skeleton")).toHaveLength(6);

    usePayStatements.mockReturnValue({ currentData: data({ statements: [], nextCursor: null }), isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
    view.rerender(<MyPayrollPage />);
    expect(screen.getByText(/no pay statements/i)).toBeVisible();

    const retry = vi.fn();
    usePayStatements.mockReturnValue({ currentData: undefined, isLoading: false, isFetching: false, isError: true, refetch: retry });
    view.rerender(<MyPayrollPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: /retry/i }));
    expect(retry).toHaveBeenCalledOnce();

    usePayStatements.mockReturnValue({ currentData: data(), isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
    view.rerender(<MyPayrollPage />);
    expect(screen.getByText("Year-to-date gross earnings")).toBeVisible();
    expect(screen.getByText("Latest net pay")).toBeVisible();
    expect(screen.getByText("Next pay date")).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: /load more/i }));
    expect(loadMore).toHaveBeenCalledOnce();
    expect(loadMore).toHaveBeenCalledWith(expect.objectContaining({ cursor: "cursor-2" }));

    usePayStatements.mockReturnValue({ currentData: data(), isLoading: false, isFetching: true, isError: false, refetch: vi.fn() });
    view.rerender(<MyPayrollPage />);
    expect(screen.getByRole("button", { name: /load more/i })).toBeDisabled();
  });

  it("keeps existing rows when load more fails and retries the same current cursor only for the active year", async () => {
    const args = { audience: "employee", actorUid: "user-1", agencyId: "agency-1", employmentId: "employment-1", year: new Date().getUTCFullYear(), cursor: "cursor-2" } as const;
    useLazyPayStatements.mockReturnValue([loadMore, { isFetching: false, isError: true, originalArgs: args }]);

    const view = render(<MyPayrollPage />);
    expect(screen.getAllByText("$900.00")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load more/i);
    await userEvent.setup().click(screen.getByRole("button", { name: /retry loading more/i }));
    expect(loadMore).toHaveBeenCalledWith(args);

    useLazyPayStatements.mockReturnValue([loadMore, { isFetching: false, isError: true, originalArgs: { ...args, year: args.year - 1 } }]);
    view.rerender(<MyPayrollPage />);
    expect(screen.queryByText(/couldn't load more/i)).not.toBeInTheDocument();
  });

  it("resets statement download errors after closing and reopening the detail dialog", async () => {
    usePayStatements.mockReturnValue({ currentData: data({ statements: [{ ...statement, statementId: "closed" }] }), isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
    download.mockRejectedValueOnce(new Error("download unavailable"));
    const user = userEvent.setup();
    render(<MyPayrollPage />);

    await user.click(screen.getByRole("button", { name: /view details/i }));
    await user.click(screen.getByRole("button", { name: /download statement/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't download/i);
    await user.click(screen.getByRole("button", { name: /close pay statement/i }));
    await user.click(screen.getByRole("button", { name: /view details/i }));
    expect(screen.queryByText(/couldn't download/i)).not.toBeInTheDocument();
  });

  it("remains employee-self-only and never renders manager, funding, other-employee, or audit data", () => {
    usePayStatements.mockReturnValue({
      currentData: data({
        managerBlockers: ["Compensation missing"],
        fundingTotals: { expectedCashRequirementCents: 999_999 },
        auditEvents: [{ type: "approval_requested" }],
        otherEmployees: [{ employeeId: "employee-2", displayName: "Other Employee" }],
      }),
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<MyPayrollPage />);

    expect(usePayStatements).toHaveBeenCalledWith({
      audience: "employee",
      actorUid: "user-1",
      agencyId: "agency-1",
      employmentId: "employment-1",
      year: new Date().getUTCFullYear(),
    });
    expect(screen.queryByText("Compensation missing")).not.toBeInTheDocument();
    expect(screen.queryByText("Other Employee")).not.toBeInTheDocument();
    expect(screen.queryByText(/expected cash requirement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/approval requested/i)).not.toBeInTheDocument();
  });
});
