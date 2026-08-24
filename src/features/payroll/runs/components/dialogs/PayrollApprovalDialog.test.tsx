import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayrollApprovalDialog } from "./PayrollApprovalDialog";
import type { PayrollRunProjection } from "../../model/types";

const api = vi.hoisted(() => ({ trigger: vi.fn(), state: {} as Record<string, unknown>, abort: vi.fn() }));
vi.mock("../../api/payrollRunEndpoints", () => ({ useLazyGetPayrollRunQuery: () => [api.trigger, api.state] }));

const scope = { audience: "agency" as const, actorUid: "actor-1", agencyId: "agency-1" };
function detail(): PayrollRunProjection {
  const enabled = { enabled: true as const, reasonCode: null };
  return {
    kind: "run", runId: "run-1", activeRevisionId: "revision-1", revisionNumber: 2, workspaceMode: "run",
    run: { runId: "run-1", runType: "regular", periodStart: "2026-08-10", periodEnd: "2026-08-23", payday: "2026-08-28", approvalDeadline: "2026-08-27T17:00:00.000Z", reopenDeadline: "2026-08-26T17:00:00.000Z", timezone: "America/New_York", workflowState: "ready_to_approve", providerStatus: "draft", projectionRevision: 9, revisionNumber: 2, activeRevisionId: "revision-1", stale: false, employeeCount: 3, includedCount: 2, deferredCount: 1, zeroDueCount: 0, blockerCount: 0, warningCount: 0, blockerCodes: [], warningCodes: [], totals: { grossEarningsCents: 10_000, reimbursementCents: 200, adjustmentCents: 300, totalDueCents: 10_500 }, preview: { status: "succeeded", revisionId: "revision-1", hash: "a".repeat(64), observedAt: "2026-08-24T12:00:00.000Z", totals: { grossCents: 10_000, reimbursementsCents: 200, employeeTaxesCents: 1_000, employeeDeductionsCents: 300, employerTaxesCents: 500, employerContributionsCents: 100, netPayCents: 8_900, expectedCashRequirementCents: 11_100 } }, asOf: "2026-08-24T12:00:00.000Z" },
    capabilities: { replacementWorkspace: true, commands: { refresh_sources: enabled, add_adjustment: enabled, remove_adjustment: enabled, defer_employee: enabled, restore_employee: enabled, request_preview: enabled, approve_payroll: enabled, reopen_payroll: enabled, refresh_reconciliation: enabled } },
    prerequisites: { revisionReady: true, dispositionsComplete: true, noBlockers: true, providerSynchronized: true, previewReady: true },
    approvalChallenge: "fresh-challenge", approvalChallengeExpiresAt: "2026-08-24T12:05:00.000Z",
  };
}

describe("PayrollApprovalDialog", () => {
  beforeEach(() => { vi.clearAllMocks(); api.state = { isFetching: true }; api.trigger.mockReturnValue({ abort: api.abort, unwrap: () => new Promise(() => undefined) }); });

  it("opens the focus-trapped shell immediately and forces a fresh detail request on each open", () => {
    const view = render(<PayrollApprovalDialog open scope={scope} runId="run-1" activeRevisionId="revision-1" capability agencyName="Harbor Care" fundingSummary="Operating •••• 4242" onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading current approval/i);
    expect(api.trigger).toHaveBeenCalledWith({ ...scope, runId: "run-1", activeRevisionId: "revision-1" }, false);
    view.rerender(<PayrollApprovalDialog open={false} scope={scope} runId="run-1" activeRevisionId="revision-1" capability agencyName="Harbor Care" onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(api.abort).toHaveBeenCalledOnce();
  });

  it("shows all bound totals, masked funding, deadlines and revision, then requires acknowledgement", async () => {
    api.trigger.mockReturnValue({ abort: api.abort, unwrap: vi.fn().mockResolvedValue(detail()) });
    const submit = vi.fn().mockResolvedValue(undefined);
    const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
    const returnFocusRef = { current: trigger };
    render(<PayrollApprovalDialog open scope={scope} runId="run-1" activeRevisionId="revision-1" capability agencyName="Harbor Care" fundingSummary="Operating •••• 4242" returnFocusRef={returnFocusRef} onOpenChange={vi.fn()} onSubmit={submit} />);
    expect(await screen.findByText("Harbor Care")).toBeInTheDocument();
    for (const value of ["$100.00", "$2.00", "$10.00", "$3.00", "$5.00", "$1.00", "$89.00", "$111.00", "$105.00"]) expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getByText("Operating •••• 4242")).toBeInTheDocument();
    expect(screen.getByText(/revision 2/i)).toBeInTheDocument();
    const approve = screen.getByRole("button", { name: "Approve payroll" });
    expect(approve).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(approve);
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ expectedPreviewRevisionId: "revision-1", expectedPreviewHash: "a".repeat(64), approvalChallenge: "fresh-challenge", acknowledgement: true }));
  });
});
