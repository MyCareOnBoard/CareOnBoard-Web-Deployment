import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BillingClaimListItem } from "@/lib/api/claims";
import X12BatchRunDialog from "./X12BatchRunDialog";

const mocks = vi.hoisted(() => ({ check: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ agencyId: "a", mode: "hha" }),
}));
vi.mock("@/lib/api/claims", () => ({
  checkX12Run: mocks.check,
  createX12Run: mocks.create,
  X12RunError: class extends Error {},
}));

const CLAIM = { id: "claim-1", claimNumber: "CLM-1", status: "pending", amount: 48, clientId: "c", clientName: "Jane Doe" } as BillingClaimListItem;

describe("X12BatchRunDialog", () => {
  it("previews every pending claim in the date range for the active program, then creates the zip", async () => {
    mocks.check.mockResolvedValue({ claimCount: 312, validClaimCount: 312, fileCount: 1, totalChargeCents: 4821000, settingsErrors: [], claimErrors: [], warnings: [] });
    const run = { id: "run-1", status: "ready" };
    mocks.create.mockResolvedValue({ run, queued: false });
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<X12BatchRunDialog claims={[CLAIM]} onClose={vi.fn()} onOpenSettings={vi.fn()} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Service date from"), "2026-09-01");
    await user.type(screen.getByLabelText("Service date to"), "2026-09-30");
    await user.click(screen.getByRole("button", { name: "Check claims" }));
    expect(mocks.check).toHaveBeenCalledWith({ context: { agencyId: "a" }, filter: { from: "2026-09-01", to: "2026-09-30", program: "hha" } });
    expect(await screen.findByText("312 claims in 1 file, $48,210.00")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Create zip" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.any(Object), skipInvalid: false }));
    expect(onCreated).toHaveBeenCalledWith(run, false);
  });

  it("blocks the zip while claims need fixing unless they are left out", async () => {
    mocks.check.mockResolvedValue({
      claimCount: 2,
      validClaimCount: 1,
      fileCount: 1,
      totalChargeCents: 4800,
      settingsErrors: [],
      claimErrors: [{ claimId: "claim-1", claimNumber: "CLM-1", message: "Client city is missing" }],
      warnings: [],
    });
    const user = userEvent.setup();
    render(<X12BatchRunDialog claims={[CLAIM]} onClose={vi.fn()} onOpenSettings={vi.fn()} onCreated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Check claims" }));
    expect(await screen.findByText("Client city is missing")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create zip" })).toHaveProperty("disabled", true);
    await user.click(screen.getByLabelText("Leave out claims that need fixing"));
    expect(screen.getByRole("button", { name: "Create zip" })).toHaveProperty("disabled", false);
  });
});
