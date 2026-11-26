import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgencyExpenseListItem, ExpenseReview } from "@/lib/api/billing-expenses";

const reviewQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/billing-expenses", () => ({ useGetExpenseReviewQuery: reviewQuery }));

import ExpenseDetailsDrawer, { receiptFileName, reviewCheckLines } from "./ExpenseDetailsDrawer";
import { rowsToLimits } from "./ExpenseSettingsDialog";

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

const review: ExpenseReview = {
  expenseId: "expense-1",
  shift: { id: "shift-1", date: "2026-11-21", startTime: "09:00", endTime: "15:00", timezone: null, clientId: "client-1", clientName: "Paul Walker" },
  shiftMatchedBy: "date",
  sameDayShiftCount: 1,
  receipt: { status: "match", total: 38, merchant: "Newark Museum", summary: "2 tickets" },
  limit: { category: "Activity fee", limit: 50, spent: 38, otherExpenseCount: 0, scope: "shift", withinLimit: true },
};

describe("ExpenseDetailsDrawer", () => {
  beforeEach(() => {
    reviewQuery.mockReset();
    reviewQuery.mockReturnValue({ currentData: undefined, isFetching: false, isError: false });
  });

  it("shows the client, shift, receipt match and limit from the review", () => {
    reviewQuery.mockReturnValue({ currentData: review, isFetching: false, isError: false });
    render(<ExpenseDetailsDrawer expense={expense} agencyId="agency-1" onClose={vi.fn()} />);

    expect(reviewQuery).toHaveBeenCalledWith({ agencyId: "agency-1", expenseId: "expense-1" }, { skip: false });
    expect(screen.getByText("Paul Walker")).toBeVisible();
    expect(screen.getByText(/09:00 – 15:00/)).toBeVisible();
    expect(screen.getByText("Their only shift that day")).toBeVisible();
    expect(screen.getByText("Amount matches the receipt")).toBeVisible();
    expect(screen.getByText("Inside the $50.00 per-shift activity fee limit")).toBeVisible();
  });

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

describe("reviewCheckLines", () => {
  it("puts a receipt mismatch and an exceeded limit first", () => {
    const lines = reviewCheckLines({
      ...review,
      receipt: { status: "mismatch", total: 30 },
      limit: { category: "Activity fee", limit: 50, spent: 58, otherExpenseCount: 1, scope: "shift", withinLimit: false },
    }, 38);
    expect(lines.map((line) => [line.tone, line.title])).toEqual([
      ["warn", "Receipt shows $30.00, not $38.00"],
      ["warn", "Over the $50.00 per-shift activity fee limit"],
    ]);
    expect(lines[1].detail).toBe("$58.00 spent on this shift, with 1 other expense.");
  });

  it("says nothing when receipt reading is off and no limit applies", () => {
    expect(reviewCheckLines({ ...review, receipt: { status: "unavailable" }, limit: null }, 38)).toEqual([]);
  });
});

describe("rowsToLimits", () => {
  it("drops blank rows and rejects incomplete or repeated ones", () => {
    expect(rowsToLimits([{ category: " Activity  fee ", amount: "$50" }, { category: "", amount: "" }])).toEqual({
      limits: [{ category: "Activity fee", amount: 50 }],
    });
    expect(rowsToLimits([{ category: "Meals", amount: "0" }])).toEqual({ error: "Enter a limit above $0 for Meals." });
    expect(rowsToLimits([{ category: "", amount: "5" }])).toEqual({ error: "Each limit needs a category." });
    expect(rowsToLimits([{ category: "Meals", amount: "5" }, { category: "meals", amount: "6" }])).toEqual({ error: "meals is listed twice." });
  });
});
