import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";
import ExpenseDetailsDrawer, { receiptFileName } from "./ExpenseDetailsDrawer";

const expense: AgencyExpenseListItem = {
  id: "expense-1",
  employeeId: "employee-1",
  employeeUid: "uid-1",
  employeeName: "Priya Joshi",
  amount: 38,
  category: "Activity fee",
  message: "Two museum tickets",
  receiptUrl: "https://storage.example.test/v0/b/app/o/receipts%2Fnewark_museum_receipt.jpg?alt=media",
  status: "pending",
  date: "2026-11-21",
  submittedAt: "2026-11-21T18:04:00.000Z",
  reviewedAt: null,
  reviewerNotes: null,
  payrollInvoiceId: null,
};

describe("ExpenseDetailsDrawer", () => {
  it("shows the details and receipt, and approves a pending expense", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<ExpenseDetailsDrawer expense={expense} onApprove={onApprove} onDecline={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Expense from Priya Joshi" })).toBeVisible();
    expect(screen.getByText("Activity fee")).toBeVisible();
    expect(screen.getByText("Two museum tickets")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open receipt newark_museum_receipt.jpg in a new tab" })).toHaveAttribute("href", expense.receiptUrl);

    await user.click(screen.getByRole("button", { name: "Approve $38.00" }));
    expect(onApprove).toHaveBeenCalledWith(expense);
  });

  it("asks for a note before declining", async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();
    render(<ExpenseDetailsDrawer expense={expense} onApprove={vi.fn()} onDecline={onDecline} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least 10 characters");
    expect(onDecline).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /Note to DSP/ }), "Receipt is for a different day");
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(onDecline).toHaveBeenCalledWith(expense, "Receipt is for a different day");
  });

  it("shows the review instead of actions once an expense is decided", () => {
    render(
      <ExpenseDetailsDrawer
        expense={{ ...expense, status: "rejected", reviewedAt: "2026-11-22T09:00:00.000Z", reviewerNotes: "Over the activity limit" }}
        onApprove={vi.fn()}
        onDecline={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Over the activity limit")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not link a receipt that isn't a web address", () => {
    render(<ExpenseDetailsDrawer expense={{ ...expense, receiptUrl: "javascript:alert(1)" }} onClose={vi.fn()} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("The receipt link can't be opened.")).toBeVisible();
  });

  it("names the receipt from its storage path", () => {
    expect(receiptFileName(expense.receiptUrl!)).toBe("newark_museum_receipt.jpg");
    expect(receiptFileName("not a url")).toBe("Receipt");
  });
});
