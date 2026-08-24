import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LegacyPayrollHistoryPanel } from "./LegacyPayrollHistoryPanel";

const api = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), trigger: vi.fn() }));
vi.mock("../../api/legacyPayrollHistoryEndpoints", () => ({
  useListLegacyPayrollHistoryQuery: (...args: unknown[]) => api.list(...args),
  useLazyGetLegacyPayrollInvoiceQuery: () => [api.trigger, api.detail],
}));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
const row = (index: number) => ({
  id: `invoice-${index}`,
  invoiceNumber: `LEG-${index}`,
  status: "paid" as const,
  grossAmount: index * 100,
  employeeId: `employee-${index}`,
  employeeName: `Employee ${index}`,
  periodStart: "2026-08-01",
  periodEnd: "2026-08-14",
  totalHours: 40,
  shiftCount: 10,
  createdAt: "2026-08-15T12:00:00.000Z",
  paidAt: "2026-08-21T12:00:00.000Z",
  mode: "hha" as const,
  legacy: true as const,
  readOnly: true as const,
});
const detail = {
  ...row(1),
  shiftIds: [], expenseIds: [], rideIds: [], overtimeHours: 0,
  updatedAt: "2026-08-21T12:00:00.000Z",
  invoicePrefill: {
    employeeName: "Employee 1", agencyName: "Care Agency", periodStart: "2026-08-01", periodEnd: "2026-08-14",
    dateRangeLabel: "Aug 1 – Aug 14, 2026", earnings: [{ description: "Regular", hours: "40", rate: "$20.00", amount: "$800.00" }],
    totals: { totalHours: "40", grossPay: "$800.00", taxWithheld: null, netPay: "$800.00" },
    payment: { summary: "Payment method unavailable" }, support: { email: "help@example.com", phone: "", addressLines: [] },
    grossAmount: 800, totalHours: 40,
  },
};

describe("LegacyPayrollHistoryPanel", () => {
  beforeEach(() => {
    api.list.mockReset(); api.detail.mockReset(); api.trigger.mockReset();
    api.list.mockImplementation((args: { cursor?: string }) => ({
      data: args.cursor
        ? { items: [row(26)], nextCursor: null, hasMore: false }
        : { items: Array.from({ length: 25 }, (_, index) => row(index + 1)), nextCursor: "legacy-2", hasMore: true },
      isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
    }));
    api.detail.mockReturnValue({ isFetching: false });
    api.trigger.mockReturnValue({ unwrap: () => Promise.resolve(detail) });
  });

  it("loads one bounded labeled legacy page and fetches detail only when opened", async () => {
    render(<LegacyPayrollHistoryPanel scope={scope} startDate="2026-06-01" endDate="2026-08-24" />);
    expect(api.list).toHaveBeenCalledWith({ ...scope, startDate: "2026-06-01", endDate: "2026-08-24" });
    expect(screen.getAllByText("Read only")).toHaveLength(25);
    expect(api.trigger).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: /view legacy invoice/i })[0]);
    await waitFor(() => expect(api.trigger).toHaveBeenCalledWith({ ...scope, invoiceId: "invoice-1" }, true));
    expect(await screen.findByText("Legacy payroll invoice — read only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument();
  });

  it("drops an old cursor before requesting a changed date range", () => {
    const view = render(<LegacyPayrollHistoryPanel scope={scope} startDate="2026-06-01" endDate="2026-08-24" />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    api.list.mockClear();
    view.rerender(<LegacyPayrollHistoryPanel scope={scope} startDate="2026-05-01" endDate="2026-07-24" />);
    expect(api.list).toHaveBeenCalledOnce();
    expect(api.list).toHaveBeenCalledWith({ ...scope, startDate: "2026-05-01", endDate: "2026-07-24" });
  });
});
