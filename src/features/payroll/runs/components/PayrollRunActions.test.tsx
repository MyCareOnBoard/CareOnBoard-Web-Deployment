import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PayrollRunActions, getPayrollActionAvailability } from "./PayrollRunActions";
import type { PayrollRunProjection } from "../model/types";

function projection(): PayrollRunProjection {
  const enabled = { enabled: true as const, reasonCode: null };
  return {
    kind: "run", runId: "run-1", activeRevisionId: "revision-1", revisionNumber: 2,
    run: {
      runId: "run-1", runType: "regular", periodStart: "2026-08-10", periodEnd: "2026-08-23",
      payday: "2026-08-28", approvalDeadline: "2026-08-27T17:00:00.000Z",
      reopenDeadline: "2026-08-26T17:00:00.000Z", timezone: "America/New_York",
      workflowState: "ready_to_approve", providerStatus: "draft", projectionRevision: 9, revisionNumber: 2,
      activeRevisionId: "revision-1", stale: false, employeeCount: 1, includedCount: 1,
      deferredCount: 0, zeroDueCount: 0, blockerCount: 0, warningCount: 0,
      blockerCodes: [], warningCodes: [], totals: { grossEarningsCents: 10_000, reimbursementCents: 0, adjustmentCents: 0, totalDueCents: 10_000 },
      preview: { status: "succeeded", revisionId: "revision-1", hash: "a".repeat(64), observedAt: "2026-08-24T12:00:00.000Z", totals: { grossCents: 10_000, reimbursementsCents: 0, employeeTaxesCents: 1_000, employeeDeductionsCents: 0, employerTaxesCents: 500, employerContributionsCents: 0, netPayCents: 9_000, expectedCashRequirementCents: 10_500 } },
      asOf: "2026-08-24T12:00:00.000Z",
    },
    capabilities: { commands: {
      refresh_sources: enabled, add_adjustment: enabled, remove_adjustment: enabled,
      defer_employee: enabled, restore_employee: enabled, request_preview: enabled,
      approve_payroll: enabled, reopen_payroll: enabled, refresh_reconciliation: enabled,
    } },
    prerequisites: { revisionReady: true, dispositionsComplete: true, noBlockers: true, providerSynchronized: true, previewReady: true },
  };
}

describe("PayrollRunActions", () => {
  it("requires the exact server capability and every client-known prerequisite", () => {
    const value = projection();
    expect(getPayrollActionAvailability(value, "approve_payroll", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") })).toEqual({ enabled: true, reason: null });
    value.prerequisites.previewReady = false;
    expect(getPayrollActionAvailability(value, "approve_payroll", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(false);
    value.prerequisites.previewReady = true;
    value.capabilities.commands.approve_payroll = undefined as never;
    expect(getPayrollActionAvailability(value, "approve_payroll", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(false);
  });

  it("fails closed for stale data, immutable provider state, active conflicts, and expired reopen", () => {
    const value = projection();
    expect(getPayrollActionAvailability(value, "request_preview", { freshness: "stale", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(false);
    value.run.providerStatus = "processing";
    expect(getPayrollActionAvailability(value, "add_adjustment", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(false);
    value.run.providerStatus = "draft";
    value.run.workflowState = "review";
    expect(getPayrollActionAvailability(value, "approve_payroll", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(false);
    value.run.workflowState = "approved";
    expect(getPayrollActionAvailability(value, "reopen_payroll", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(true);
    value.activeOperation = { operationId: "a".repeat(64), command: "refresh_sources", state: "running", pollAfterMs: 1_000 };
    expect(getPayrollActionAvailability(value, "request_preview", { freshness: "fresh", now: new Date("2026-08-24T12:00:00Z") }).enabled).toBe(false);
    delete value.activeOperation;
    expect(getPayrollActionAvailability(value, "reopen_payroll", { freshness: "fresh", now: new Date("2026-08-27T12:00:00Z") }).enabled).toBe(false);
  });

  it("does not render deferral until its explicit server capability is supplied", () => {
    const value = projection();
    const props = { projection: value, freshness: "fresh" as const, onAction: vi.fn(), now: new Date("2026-08-24T12:00:00Z") };
    const view = render(<PayrollRunActions {...props} />);
    expect(screen.queryByRole("button", { name: /add adjustment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /defer employee/i })).not.toBeInTheDocument();
    view.rerender(<PayrollRunActions {...props} employeeActionsAvailable extendedCapabilities={{ deferralOffCycle: true }} />);
    expect(screen.getByRole("button", { name: /add adjustment/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /defer employee/i })).toBeEnabled();
  });

  it("associates disabled financial actions with an accessible reason instead of title-only text", () => {
    render(<PayrollRunActions projection={projection()} freshness="stale" onAction={vi.fn()} />);

    const approve = screen.getByRole("button", { name: "Approve payroll" });
    expect(approve).toBeDisabled();
    expect(approve).not.toHaveAttribute("title");
    expect(approve).toHaveAccessibleDescription("Refresh the payroll before making financial changes.");
  });

  it("shows progress without claiming financial success", () => {
    render(<PayrollRunActions projection={projection()} freshness="fresh" onAction={vi.fn()} activeIntent="request_preview" />);
    expect(screen.getByRole("status")).toHaveTextContent("Starting payroll preview");
    expect(screen.queryByText(/payroll approved|payment complete/i)).not.toBeInTheDocument();
  });
});
