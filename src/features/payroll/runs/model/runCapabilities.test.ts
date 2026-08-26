import { describe, expect, it } from "vitest";

import { getPayrollRunActionState } from "./runCapabilities";
import type { CurrentPayrollRunResponse, PayrollRunCommandName } from "./types";

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

function runProjection(): Extract<CurrentPayrollRunResponse, { kind: "run" }> {
  return {
    kind: "run",
    runId: "run-a",
    activeRevisionId: "revision-a",
    revisionNumber: 2,
    run: {} as never,
    capabilities: { commands },
    prerequisites: {} as never,
  };
}

describe("getPayrollRunActionState", () => {
  it("returns the exact server capability", () => {
    const projection = runProjection();
    expect(getPayrollRunActionState(projection, "refresh_sources")).toEqual({ enabled: true, reasonCode: null });
    expect(getPayrollRunActionState(projection, "request_preview")).toEqual({
      enabled: false,
      reasonCode: "preview_not_ready",
    });
  });

  it("disables every command for an empty current projection", () => {
    const projection: CurrentPayrollRunResponse = {
      kind: "empty",
      runId: null,
      activeRevisionId: null,
      revisionNumber: null,
      run: null,
      emptyReason: "no_active_period",
    };
    const commandNames = Object.keys(commands) as PayrollRunCommandName[];
    for (const command of commandNames) {
      expect(getPayrollRunActionState(projection, command)).toEqual({
        enabled: false,
        reasonCode: "no_active_run",
      });
    }
  });

  it("fails closed on a conflicting active operation", () => {
    const projection = runProjection();
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
