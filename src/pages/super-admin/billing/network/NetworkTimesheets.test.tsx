import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { BillingWorkspaceProvider, type BillingWorkspaceContextValue } from "../BillingWorkspaceContext";

const api = vi.hoisted(() => ({ initial: vi.fn(), options: vi.fn(), search: vi.fn(), page: vi.fn(), invalidate: vi.fn() }));
const timesheets = vi.hoisted(() => ({ getStaffTimesheet: vi.fn(), reviewStaffTimesheet: vi.fn(), createStaffPayrollInvoice: vi.fn(), getStaffTimesheetErrorMessage: vi.fn(() => "Failed") }));
vi.mock("@/lib/firebase", () => ({ app: {}, auth: {}, db: {} })); vi.mock("@/utils/auth/store/authSlice", () => ({ default: (state = {}) => state })); vi.mock("@/utils/auth/services/authService", () => ({}));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() })); vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ui/button", () => ({ Button: (p: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...p} /> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null, DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>, DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>, DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>, DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>, DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2> }));
vi.mock("@/components/ui/textarea", () => ({ Textarea: (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} /> }));
vi.mock("@/lib/api/staff-timesheets", () => ({ ...timesheets }));
vi.mock("@/lib/api/network-billing", () => ({ NETWORK_BILLING_QUERY_OPTIONS: {}, networkBillingApi: { useGetTimesheetsPageQuery: api.initial, useLazyGetTimesheetsPageQuery: () => [api.page, { isFetching: false }], useLazySearchBillingOptionsQuery: () => [api.search, api.options()], util: { invalidateTags: api.invalidate } } }));
vi.mock("@/pages/agency/billing/staff-timesheets/StaffTimesheetsTable", () => ({ StaffTimesheetStatusPill: ({ status }: { status: string }) => <span>{status}</span>, default: ({ timesheets: rows, onView, onReject, onApprove, onCreatePayroll }: { timesheets: Array<{ id: string; staffName: string }>; onView: (row: unknown) => void; onReject: (row: unknown) => void; onApprove: (row: unknown) => void; onCreatePayroll: (row: unknown) => void }) => <div>{rows.map((row) => <div key={row.id}><span>{row.staffName}</span><button onClick={() => onView(row)}>View</button><button onClick={() => onApprove(row)}>Approve</button><button onClick={() => onReject(row)}>Reject</button><button onClick={() => onCreatePayroll(row)}>Create payroll</button></div>)}</div> }));
import NetworkTimesheets from "./NetworkTimesheets";

const workspace: BillingWorkspaceContextValue = { scope: { kind: "network" }, startDate: "2026-07-01", endDate: "2026-07-31", mode: "ddd", actorUid: "super-1", environment: "staging", onDateRangeChange: vi.fn() };
const row = { id: "sheet-1", agencyId: "atlas", agencyName: "Atlas Care", staffKey: "private-key", staffUid: "staff-1", staffName: "Avery Nurse", status: "pending" as const, mode: "ddd" as const, periodStart: "2026-07-01", periodEnd: "2026-07-07", payPreview: { billingType: "hourly" as const, billingRate: 10, totalHours: 8, grossAmount: 80 } };

describe("NetworkTimesheets", () => {
  it("renders provider-free review data and redacts a fetched signature while retaining detailed review fields", async () => {
    api.options.mockReturnValue({ data: [] }); api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });
    api.initial.mockReturnValue({ data: { page: { rows: [row], nextCursor: null, total: 1, hasMore: false } }, isLoading: false, isFetching: false });
    timesheets.getStaffTimesheet.mockResolvedValue({ ...row, role: "DSP", entries: [{ week: 1, day: "Mon", date: "2026-07-01", checkIn: "8 AM", checkOut: "4 PM", hours: 8 }], totalHours: 8, signature: { signatureType: "type", signatureData: "SECRET SIGNATURE" }, signatureInfo: "", reviewedAt: null, reviewedBy: null, reviewerNotes: "Check break", payrollInvoiceId: null, createdAt: "", updatedAt: "" });
    render(<BillingWorkspaceProvider value={workspace}><NetworkTimesheets /></BillingWorkspaceProvider>);
    expect(screen.getByRole("region", { name: "Network timesheets" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(await screen.findByText("Role")).toBeVisible(); expect(screen.getByText("Program")).toBeVisible(); expect(screen.getByText("Review notes")).toBeVisible(); expect(screen.getByText("Entries")).toBeVisible();
    expect(screen.getByText(/Signature received.*redacted/)).toBeVisible(); expect(screen.queryByText("SECRET SIGNATURE")).toBeNull();
    expect(timesheets.getStaffTimesheet).toHaveBeenCalledWith({ context: { agencyId: "atlas" }, timesheetId: "sheet-1" });
  });

  it("binds approval, rejection, and payroll creation to the selected row agency", async () => {
    api.options.mockReturnValue({ data: [] }); api.search.mockReturnValue({ unwrap: vi.fn().mockResolvedValue([]), abort: vi.fn() });
    api.initial.mockReturnValue({ data: { page: { rows: [row], nextCursor: null, total: 1, hasMore: false } }, isLoading: false, isFetching: false });
    timesheets.reviewStaffTimesheet.mockResolvedValue(undefined);
    timesheets.createStaffPayrollInvoice.mockResolvedValue({ id: "payroll-1" });
    render(<BillingWorkspaceProvider value={workspace}><NetworkTimesheets /></BillingWorkspaceProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(timesheets.reviewStaffTimesheet).toHaveBeenCalledWith({ context: { agencyId: "atlas" }, timesheetId: "sheet-1", status: "approved" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.change(screen.getByLabelText("Reason for rejection"), { target: { value: "Missing note" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject timesheet" }));
    await waitFor(() => expect(timesheets.reviewStaffTimesheet).toHaveBeenCalledWith({ context: { agencyId: "atlas" }, timesheetId: "sheet-1", status: "rejected", reviewerNotes: "Missing note" }));
    fireEvent.click(screen.getByRole("button", { name: "Create payroll" }));
    await waitFor(() => expect(timesheets.createStaffPayrollInvoice).toHaveBeenCalledWith({ context: { agencyId: "atlas" }, payload: { staffUid: "staff-1", periodStart: "2026-07-01", periodEnd: "2026-07-07", staffTimesheetIds: ["sheet-1"] } }));
    expect(api.invalidate).toHaveBeenCalledWith(expect.arrayContaining([{ type: "Timesheets", id: "NETWORK" }, { type: "Payroll", id: "NETWORK" }, { type: "NETWORK", id: "atlas" }]));
  });
});
