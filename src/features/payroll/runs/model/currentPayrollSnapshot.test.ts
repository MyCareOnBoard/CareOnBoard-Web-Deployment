import { describe, expect, it } from "vitest";

import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  EmptyCurrentPayrollProjection,
} from "./types";
import { acceptCurrentPayrollSnapshot } from "./currentPayrollSnapshot";

const runResponse = (
  runId = "run-1",
  activeRevisionId = "revision-1",
  revisionNumber = 1,
): CurrentPayrollRunResponse => ({
  kind: "run",
  runId,
  activeRevisionId,
  revisionNumber,
  workspaceMode: "run",
  run: { runId, activeRevisionId, revisionNumber },
  capabilities: { replacementWorkspace: true, commands: {} },
  prerequisites: {},
} as unknown as CurrentPayrollRunResponse);

const employeePage = (
  runId = "run-1",
  activeRevisionId = "revision-1",
  revisionNumber = 1,
): CurrentPayrollEmployeePage => ({
  kind: "run",
  runId,
  activeRevisionId,
  revisionNumber,
  workspaceMode: "run",
  capabilities: { replacementWorkspace: true },
  items: [],
  nextCursor: null,
  hasMore: false,
});

const emptyResponse = (workspaceMode: "legacy" | "run"): EmptyCurrentPayrollProjection => ({
  kind: "empty",
  runId: null,
  activeRevisionId: null,
  revisionNumber: null,
  run: null,
  emptyReason: "no_active_period",
  workspaceMode,
  capabilities: { replacementWorkspace: workspaceMode === "run" },
});

describe("acceptCurrentPayrollSnapshot", () => {
  it("accepts only an equal run, opaque revision, and display revision pair as fresh", () => {
    const accepted = acceptCurrentPayrollSnapshot({
      runResponse: runResponse(),
      employeePage: employeePage(),
      previous: null,
      scopeKey: "scope-a",
    });

    expect(accepted).toMatchObject({
      scopeKey: "scope-a",
      freshness: "fresh",
      commandsEnabled: true,
      mismatchIdentity: null,
      workspaceMode: "run",
    });
  });

  it("retains a same-scope prior snapshot and disables commands when identities mismatch", () => {
    const previous = acceptCurrentPayrollSnapshot({
      runResponse: runResponse(),
      employeePage: employeePage(),
      previous: null,
      scopeKey: "scope-a",
    });

    const accepted = acceptCurrentPayrollSnapshot({
      runResponse: runResponse("run-1", "revision-2", 2),
      employeePage: employeePage(),
      previous,
      scopeKey: "scope-a",
    });

    expect(accepted.runResponse).toBe(previous.runResponse);
    expect(accepted.employeePage).toBe(previous.employeePage);
    expect(accepted).toMatchObject({ freshness: "stale", commandsEnabled: false });
    expect(accepted.mismatchIdentity).toContain("revision-2");
  });

  it("treats a display revision mismatch as stale without using it as authority", () => {
    const previous = acceptCurrentPayrollSnapshot({
      runResponse: runResponse(),
      employeePage: employeePage(),
      previous: null,
      scopeKey: "scope-a",
    });

    const accepted = acceptCurrentPayrollSnapshot({
      runResponse: runResponse("run-1", "revision-1", 2),
      employeePage: employeePage("run-1", "revision-1", 1),
      previous,
      scopeKey: "scope-a",
    });

    expect(accepted.freshness).toBe("stale");
    expect(accepted.identity).toEqual({
      kind: "run",
      runId: "run-1",
      activeRevisionId: "revision-1",
      revisionNumber: 1,
    });
  });

  it("clears retained payroll data immediately when the authorization scope changes", () => {
    const previous = acceptCurrentPayrollSnapshot({
      runResponse: runResponse(),
      employeePage: employeePage(),
      previous: null,
      scopeKey: "scope-a",
    });

    const accepted = acceptCurrentPayrollSnapshot({
      runResponse: undefined,
      employeePage: undefined,
      previous,
      scopeKey: "scope-b",
    });

    expect(accepted).toMatchObject({
      scopeKey: "scope-b",
      freshness: "loading",
      runResponse: null,
      employeePage: null,
      commandsEnabled: false,
    });
  });

  it("accepts matching empty modes but rejects unknown or mixed empty pairs", () => {
    const matching = acceptCurrentPayrollSnapshot({
      runResponse: emptyResponse("legacy"),
      employeePage: emptyResponse("legacy"),
      previous: null,
      scopeKey: "scope-a",
    });
    const mixed = acceptCurrentPayrollSnapshot({
      runResponse: emptyResponse("run"),
      employeePage: emptyResponse("legacy"),
      previous: null,
      scopeKey: "scope-a",
    });

    expect(matching).toMatchObject({ freshness: "fresh", workspaceMode: "legacy" });
    expect(mixed).toMatchObject({
      freshness: "unavailable",
      workspaceMode: null,
      commandsEnabled: false,
    });
  });

  it("fails closed when a run pair disagrees on workspace cutover capability", () => {
    const mismatchedRun = {
      ...runResponse(),
      workspaceMode: "legacy",
      capabilities: { replacementWorkspace: false, commands: {} },
    } as unknown as CurrentPayrollRunResponse;

    const accepted = acceptCurrentPayrollSnapshot({
      runResponse: mismatchedRun,
      employeePage: employeePage(),
      previous: null,
      scopeKey: "scope-a",
    });

    expect(accepted).toMatchObject({
      freshness: "unavailable",
      workspaceMode: null,
      commandsEnabled: false,
    });
  });
});
