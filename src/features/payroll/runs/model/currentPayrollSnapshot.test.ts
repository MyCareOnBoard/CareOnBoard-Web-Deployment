import { describe, expect, it } from "vitest";

import type { CurrentPayrollEmployeePage, CurrentPayrollRunResponse } from "./types";
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
  run: { runId, activeRevisionId, revisionNumber },
  capabilities: { commands: {} },
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
  items: [],
  nextCursor: null,
  hasMore: false,
});

describe("acceptCurrentPayrollSnapshot", () => {
  it("accepts only an equal run and revision pair as fresh", () => {
    expect(acceptCurrentPayrollSnapshot({
      runResponse: runResponse(),
      employeePage: employeePage(),
      previous: null,
      scopeKey: "scope-a",
    })).toMatchObject({
      scopeKey: "scope-a",
      freshness: "fresh",
      commandsEnabled: true,
      mismatchIdentity: null,
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
    expect(accepted).toMatchObject({ freshness: "stale", commandsEnabled: false });
    expect(accepted.mismatchIdentity).toContain("revision-2");
  });

  it("treats a display revision mismatch as stale", () => {
    const accepted = acceptCurrentPayrollSnapshot({
      runResponse: runResponse("run-1", "revision-1", 2),
      employeePage: employeePage("run-1", "revision-1", 1),
      previous: null,
      scopeKey: "scope-a",
    });

    expect(accepted).toMatchObject({ freshness: "unavailable", commandsEnabled: false });
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

  it("accepts matching empty projections", () => {
    const empty = {
      kind: "empty" as const,
      runId: null,
      activeRevisionId: null,
      revisionNumber: null,
      run: null,
      emptyReason: "no_active_period" as const,
    };
    expect(acceptCurrentPayrollSnapshot({
      runResponse: empty,
      employeePage: empty,
      previous: null,
      scopeKey: "scope-a",
    })).toMatchObject({ freshness: "fresh", commandsEnabled: false });
  });
});
