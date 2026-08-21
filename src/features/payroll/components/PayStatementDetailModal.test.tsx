import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayStatementDetailModal } from "./PayStatementDetailModal";

const download = vi.hoisted(() => vi.fn());
vi.mock("../api/employeePayrollEndpoints", () => ({ downloadEmployeePayStatementPdf: download }));

const statement = (overrides: Record<string, unknown> = {}) => ({
  statementId: "statement-1", periodStart: "2026-06-01", periodEnd: "2026-06-14", payDate: "2026-06-20", status: "paid" as const,
  grossPayCents: 120_000, deductionsCents: 30_000, netPayCents: 90_000,
  earnings: [{ label: "Regular hours", hours: 80, rateCents: 1_500, amountCents: 120_000 }], reimbursements: [], taxes: [{ label: "Federal tax", hours: null, rateCents: null, amountCents: 20_000 }], otherDeductions: [],
  paymentMethod: "direct_deposit" as const, downloadAvailable: true, ...overrides,
});

describe("PayStatementDetailModal", () => {
  beforeEach(() => {
    download.mockReset();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:statement") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("shows paid details and downloads exactly once", async () => {
    download.mockReturnValue(new Promise<Blob>(() => undefined));
    const user = userEvent.setup();
    render(<PayStatementDetailModal open statement={statement()} currency="USD" employmentId="employment-1" onOpenChange={vi.fn()} />);
    expect(screen.getByText(/regular hours/i)).toBeVisible();
    expect(screen.getByText(/direct deposit/i)).toBeVisible();
    await user.dblClick(screen.getByRole("button", { name: /download statement/i }));
    expect(download).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledWith({ employmentId: "employment-1", statementId: "statement-1" });
  });

  it("keeps processing and needs-attention guidance scoped to the same dialog without exposing unavailable downloads", () => {
    const view = render(<PayStatementDetailModal open statement={statement({ status: "processing", downloadAvailable: false })} currency="USD" employmentId="employment-1" onOpenChange={vi.fn()} />);
    expect(screen.getByText(/finalizing payroll/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /download statement/i })).not.toBeInTheDocument();
    view.rerender(<PayStatementDetailModal open statement={statement({ status: "needs_attention", downloadAvailable: false })} currency="USD" employmentId="employment-1" onOpenChange={vi.fn()} />);
    expect(screen.getByText(/agency must resolve/i)).toBeVisible();
  });

  it("keeps download failures in the open dialog and updates selected cached statement values without a detail fetch", async () => {
    download.mockRejectedValueOnce(new Error("download unavailable"));
    const view = render(<PayStatementDetailModal open statement={statement()} currency="USD" employmentId="employment-1" onOpenChange={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /download statement/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't download/i);
    expect(screen.getByRole("dialog")).toBeVisible();

    view.rerender(<PayStatementDetailModal open statement={statement({ netPayCents: 95_000 })} currency="USD" employmentId="employment-1" onOpenChange={vi.fn()} />);
    expect(screen.getByText("$950.00")).toBeVisible();
    expect(download).toHaveBeenCalledOnce();
  });
});
