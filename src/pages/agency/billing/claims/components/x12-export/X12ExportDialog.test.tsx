import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BillingClaimListItem } from "@/lib/api/claims";
import X12ExportDialog from "./X12ExportDialog";

const mocks = vi.hoisted(() => ({ check: vi.fn() }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ agencyId: "a" }),
}));
vi.mock("@/lib/api/claims", () => ({
  checkX12Export: mocks.check,
  exportClaimsX12: vi.fn(),
  X12ExportError: class extends Error {},
}));

const CLAIM = {
  id: "claim-1",
  claimNumber: "CLM-1",
  status: "pending",
  amount: 10,
  clientId: "client-1",
  clientName: "Zahra Barbour",
} as BillingClaimListItem;

describe("X12ExportDialog", () => {
  it("opens the claim report for a claim that needs fixing", async () => {
    mocks.check.mockResolvedValue({
      valid: false,
      claimCount: 1,
      settingsErrors: [],
      claimErrors: [{ claimId: "claim-1", claimNumber: "CLM-1", message: "Client city is missing" }],
      warnings: [],
    });
    const onOpenReport = vi.fn();
    const user = userEvent.setup();
    render(
      <X12ExportDialog open claims={[CLAIM]} onClose={vi.fn()} onOpenSettings={vi.fn()} onExported={vi.fn()} onOpenReport={onOpenReport} />,
    );
    await user.click(screen.getByRole("button", { name: "Check claims" }));
    await user.click(await screen.findByRole("button", { name: "Open claim report" }));
    expect(onOpenReport).toHaveBeenCalledWith(CLAIM);
  });
});
