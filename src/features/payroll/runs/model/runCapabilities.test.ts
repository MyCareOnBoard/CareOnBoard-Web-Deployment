import { describe, expect, it } from "vitest";

import { getPayrollRunActionState } from "./runCapabilities";
import type {
  CurrentPayrollRunResponse,
  PayrollRunCommandName,
} from "./types";

const commands = {
  refresh_sources: { enabled: true, reasonCode: null },
  add_adjustment: { enabled: false, reasonCode: "run_not_editable" },
  remove_adjustment: { enabled: false, reasonCode: "run_not_editable" },
  defer_employee: { enabled: false, reasonCode: "capability_disabled" },
  restore_employee: { enabled: false, reasonCode: "capability_disabled" },
  request_preview: { enabled: false, reasonCode: "preview_not_ready" },
  approve_payroll: { enabled: false, reasonCode: "approval_not_ready" },
  reopen_payroll: { enabled: false, reasonCode: "reopen_not_available" },
  refresh_reconciliation: { enabled: true, reasonCode: null },
} as const;

function runProjection(): CurrentPayrollRunResponse {
  return {
    kind: "run",
    runId: "run-a",
    activeRevisionId: "revision-a",
    revisionNumber: 2,
    workspaceMode: "run",
    run: {
      runId: "run-a",
      runType: "regular",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-23",
      payday: "2026-08-28",
      approvalDeadline: "2026-08-27T17:00:00.000Z",
      reopenDeadline: null,
      timezone: "America/New_York",
      workflowState: "review",
      providerStatus: "draft",
      projectionRevision: 9,
      revisionNumber: 2,
      activeRevisionId: "revision-a",
      stale: false,
      employeeCount: 1,
      includedCount: 1,
      deferredCount: 0,
      zeroDueCount: 0,
      blockerCount: 0,
      warningCount: 0,
      blockerCodes: [],
      warningCodes: [],
      totals: {
        grossEarningsCents: 100_00,
        reimbursementCents: 0,
        adjustmentCents: 0,
        totalDueCents: 100_00,
      },
      preview: {
        status: "none",
        revisionId: null,
        hash: null,
        observedAt: null,
        totals: null,
      },
      asOf: "2026-08-24T12:00:00.000Z",
    },
    capabilities: { replacementWorkspace: true, commands },
    prerequisites: {
      revisionReady: true,
      dispositionsComplete: true,
      noBlockers: true,
      providerSynchronized: false,
      previewReady: false,
    },
  };
}

describe("getPayrollRunActionState", () => {
  it("returns the exact server capability without deriving authority from workflow state", () => {
    const projection = runProjection();

    expect(getPayrollRunActionState(projection, "refresh_sources")).toEqual({
      enabled: true,
      reasonCode: null,
    });
    expect(getPayrollRunActionState(projection, "request_preview")).toEqual({
      enabled: false,
      reasonCode: "preview_not_ready",
    });
  });

  it("disables every command for an explicit empty current projection", () => {
    const projection: CurrentPayrollRunResponse = {
      kind: "empty",
      runId: null,
      activeRevisionId: null,
      revisionNumber: null,
      run: null,
      emptyReason: "no_active_period",
      workspaceMode: "legacy",
      capabilities: { replacementWorkspace: false },
    };

    const commandNames: PayrollRunCommandName[] = [
      "refresh_sources",
      "add_adjustment",
      "remove_adjustment",
      "defer_employee",
      "restore_employee",
      "request_preview",
      "approve_payroll",
      "reopen_payroll",
      "refresh_reconciliation",
    ];

    for (const command of commandNames) {
      expect(getPayrollRunActionState(projection, command)).toEqual({
        enabled: false,
        reasonCode: "no_active_run",
      });
    }
  });

  it("fails closed on a conflicting active operation even if a command is marked enabled", () => {
    const projection = runProjection();
    if (projection.kind !== "run") throw new Error("Expected run projection.");
    projection.activeOperation = {
      operationId: "a".repeat(64),
      command: "refresh_reconciliation",
      state: "running",
      pollAfterMs: 1_000,
    };

    expect(getPayrollRunActionState(projection, "refresh_sources")).toEqual({
      enabled: false,
      reasonCode: "operation_in_progress",
    });
  });
});
