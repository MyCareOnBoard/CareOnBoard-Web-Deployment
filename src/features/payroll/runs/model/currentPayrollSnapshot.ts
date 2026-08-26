import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  PayrollRunIdentity,
} from "./types";

export type PayrollSnapshotFreshness = "loading" | "fresh" | "stale" | "unavailable";

export type AcceptedPayrollSnapshot = {
  scopeKey: string;
  runResponse: CurrentPayrollRunResponse | null;
  employeePage: CurrentPayrollEmployeePage | null;
  identity: PayrollRunIdentity | null;
  freshness: PayrollSnapshotFreshness;
  commandsEnabled: boolean;
  mismatchIdentity: string | null;
};

export type AcceptCurrentPayrollSnapshotArgs = {
  runResponse: CurrentPayrollRunResponse | undefined;
  employeePage: CurrentPayrollEmployeePage | undefined;
  previous: AcceptedPayrollSnapshot | null;
  scopeKey: string;
};

function identityOf(
  value: CurrentPayrollRunResponse | CurrentPayrollEmployeePage,
): PayrollRunIdentity {
  if (value.kind === "empty") {
    return { kind: "empty", runId: null, activeRevisionId: null, revisionNumber: null };
  }
  return {
    kind: "run",
    runId: value.runId,
    activeRevisionId: value.activeRevisionId,
    revisionNumber: value.revisionNumber,
  };
}

function matchingPair(
  runResponse: CurrentPayrollRunResponse,
  employeePage: CurrentPayrollEmployeePage,
): boolean {
  if (runResponse.kind !== employeePage.kind) return false;
  if (runResponse.kind === "empty" && employeePage.kind === "empty") return true;
  if (runResponse.kind !== "run" || employeePage.kind !== "run") return false;
  return runResponse.runId === employeePage.runId
    && runResponse.activeRevisionId === employeePage.activeRevisionId
    && runResponse.revisionNumber === employeePage.revisionNumber;
}

function pairKey(
  runResponse: CurrentPayrollRunResponse | undefined,
  employeePage: CurrentPayrollEmployeePage | undefined,
): string {
  const identity = (value: CurrentPayrollRunResponse | CurrentPayrollEmployeePage | undefined) => (
    value
      ? [value.kind, value.runId, value.activeRevisionId, value.revisionNumber]
      : null
  );
  return JSON.stringify([identity(runResponse), identity(employeePage)]);
}

function blank(scopeKey: string, freshness: "loading" | "unavailable", mismatchIdentity: string | null) {
  return {
    scopeKey,
    runResponse: null,
    employeePage: null,
    identity: null,
    freshness,
    commandsEnabled: false,
    mismatchIdentity,
  } satisfies AcceptedPayrollSnapshot;
}

function retain(
  previous: AcceptedPayrollSnapshot,
  mismatchIdentity: string,
): AcceptedPayrollSnapshot {
  return {
    ...previous,
    freshness: "stale",
    commandsEnabled: false,
    mismatchIdentity,
  };
}

export function acceptCurrentPayrollSnapshot(
  args: AcceptCurrentPayrollSnapshotArgs,
): AcceptedPayrollSnapshot {
  const previous = args.previous?.scopeKey === args.scopeKey ? args.previous : null;

  if (!args.runResponse || !args.employeePage) {
    return previous
      ? retain(previous, pairKey(args.runResponse, args.employeePage))
      : blank(args.scopeKey, "loading", null);
  }

  if (!matchingPair(args.runResponse, args.employeePage)) {
    const mismatchIdentity = pairKey(args.runResponse, args.employeePage);
    return previous
      ? retain(previous, mismatchIdentity)
      : blank(args.scopeKey, "unavailable", mismatchIdentity);
  }

  const identity = identityOf(args.runResponse);
  return {
    scopeKey: args.scopeKey,
    runResponse: args.runResponse,
    employeePage: args.employeePage,
    identity,
    freshness: "fresh",
    commandsEnabled: args.runResponse.kind === "run",
    mismatchIdentity: null,
  };
}
