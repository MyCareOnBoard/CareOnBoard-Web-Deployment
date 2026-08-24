import { useEffect, useRef } from "react";

import { useGetCurrentPayrollEmployeesQuery, useGetCurrentPayrollRunQuery } from "../api/payrollRunEndpoints";
import {
  acceptCurrentPayrollSnapshot,
  type AcceptedPayrollSnapshot,
} from "../model/currentPayrollSnapshot";
import type { AgencyPayrollRunScope } from "../model/types";

export type CurrentPayrollWorkspaceState = AcceptedPayrollSnapshot & {
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
};

export type CurrentPayrollWorkspaceOptions = {
  skip?: boolean;
};

export function currentPayrollScopeKey(scope: AgencyPayrollRunScope): string {
  return JSON.stringify([scope.audience, scope.actorUid, scope.agencyId]);
}

export function useCurrentPayrollWorkspace(
  scope: AgencyPayrollRunScope,
  { skip = false }: CurrentPayrollWorkspaceOptions = {},
): CurrentPayrollWorkspaceState {
  const skipCurrent = skip || !scope.actorUid || !scope.agencyId;
  const current = useGetCurrentPayrollRunQuery(scope, { skip: skipCurrent });
  const employees = useGetCurrentPayrollEmployeesQuery(scope, { skip: skipCurrent });
  const scopeKey = currentPayrollScopeKey(scope);
  const previousRef = useRef<AcceptedPayrollSnapshot | null>(null);
  const refetchedMismatchKeys = useRef(new Set<string>());
  const trackedScopeKey = useRef(scopeKey);

  if (trackedScopeKey.current !== scopeKey) {
    trackedScopeKey.current = scopeKey;
    previousRef.current = null;
    refetchedMismatchKeys.current.clear();
  }

  const accepted = acceptCurrentPayrollSnapshot({
    runResponse: skipCurrent ? undefined : current.currentData,
    employeePage: skipCurrent ? undefined : employees.currentData,
    previous: previousRef.current,
    scopeKey,
  });

  if (accepted.freshness === "fresh") previousRef.current = accepted;
  const isLoading = current.isLoading || employees.isLoading;
  const isFetching = current.isFetching || employees.isFetching;
  const error = current.error ?? employees.error ?? null;
  const visibleAccepted = accepted.freshness === "fresh" && (isFetching || error)
    ? { ...accepted, freshness: "stale" as const, commandsEnabled: false }
    : accepted.freshness === "loading" && error && !isLoading
      ? { ...accepted, freshness: "unavailable" as const }
      : accepted;

  useEffect(() => {
    if (skipCurrent || !accepted.mismatchIdentity || !current.currentData || !employees.currentData
      || current.isFetching || employees.isFetching
      || refetchedMismatchKeys.current.has(accepted.mismatchIdentity)) {
      return;
    }
    refetchedMismatchKeys.current.add(accepted.mismatchIdentity);
    current.refetch();
    employees.refetch();
  }, [accepted.mismatchIdentity, current, employees, skipCurrent]);

  return {
    ...visibleAccepted,
    isLoading,
    isFetching,
    error,
    refetch: () => {
      if (skipCurrent) return;
      current.refetch();
      employees.refetch();
    },
  };
}
