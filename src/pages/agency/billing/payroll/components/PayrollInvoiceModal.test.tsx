import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PayrollInvoiceDocument } from "../types";
import PayrollInvoiceModal from "./PayrollInvoiceModal";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const invoice: PayrollInvoiceDocument = {
  invoiceTo: { name: "Care Agency", addressLines: [], phone: "" },
  staffMember: { name: "Alex Morgan", addressLines: [], phone: "" },
  earnings: [{ description: "Regular", hours: "40", rate: "$20.00", amount: "$800.00" }],
  totals: { totalHours: "40", grossPay: "$800.00", taxWithheld: null, netPay: "$800.00" },
  payment: { bankName: "", accountName: "Alex Morgan", accountNumberMasked: "Unavailable" },
  termsSnippet: "Legacy record.",
  support: { email: "help@example.com", phone: "", addressLines: [] },
  accountManagerName: "Care Agency",
  dateRangeLabel: "Aug 1 – Aug 14, 2026",
  status: "pending",
};

describe("PayrollInvoiceModal legacy detail", () => {
  it("is always labeled read-only and never exposes or invokes a supplied legacy mutation callback", () => {
    const markPaid = vi.fn();
    render(<PayrollInvoiceModal open staffName="Alex Morgan" invoice={invoice} onClose={vi.fn()} onMarkPaid={markPaid} markingPaid />);
    expect(screen.getByText("Legacy payroll invoice — read only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark as paid/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print invoice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    expect(markPaid).not.toHaveBeenCalled();
  });
});
