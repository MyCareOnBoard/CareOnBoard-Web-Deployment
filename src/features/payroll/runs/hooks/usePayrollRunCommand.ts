import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { useLazyGetAgencyPayrollOperationQuery } from "../../api/agencyPayrollEndpoints";
import type { PayrollOperation } from "../../model/types";
import { usePayrollOperations } from "../../operations/PayrollOperationProvider";
import {
  useCreateOffCyclePayrollRunMutation,
  useRunPayrollRunCommandMutation,
  type CreateOffCyclePayrollArgs,
  type PayrollRunCommandArgs,
} from "../api/payrollRunCommands";
import type { AgencyPayrollRunScope, PayrollRunCommandName } from "../model/types";

export type PayrollRunCommandErrorCode = "PROJECTION_STALE" | "CURSOR_STALE"
  | "CAPABILITY_DISABLED" | "OPERATION_IN_PROGRESS" | "VALIDATION_FAILED" | "REQUEST_FAILED";

const errorCopy: Record<PayrollRunCommandErrorCode, string> = {
  PROJECTION_STALE: "Payroll changed before this action could start. Refresh and review the current revision.",
  CURSOR_STALE: "The payroll list changed. Refresh before continuing.",
  CAPABILITY_DISABLED: "This payroll action is not currently available. Refresh to confirm its status.",
  OPERATION_IN_PROGRESS: "Another payroll action is already starting. Wait for it to finish.",
  VALIDATION_FAILED: "The payroll action needs corrected information before it can start.",
  REQUEST_FAILED: "The payroll action could not be started. Check your connection and try again.",
};

export class PayrollRunCommandError extends Error {
  readonly refreshRequired: boolean;
  constructor(readonly code: PayrollRunCommandErrorCode, message = errorCopy[code]) {
    super(message);
    this.name = "PayrollRunCommandError";
    this.refreshRequired = ["PROJECTION_STALE", "CURSOR_STALE", "CAPABILITY_DISABLED"].includes(code);
  }
}

function normalizeError(value: unknown): PayrollRunCommandError {
  if (value instanceof PayrollRunCommandError) return value;
  const data = (value as { data?: { code?: unknown } } | undefined)?.data;
  const raw = typeof data?.code === "string" ? data.code : "REQUEST_FAILED";
  const code = Object.hasOwn(errorCopy, raw) ? raw as PayrollRunCommandErrorCode : "REQUEST_FAILED";
  return new PayrollRunCommandError(code);
}

type Flight = { key: string; promise: Promise<PayrollOperation> };

export function usePayrollRunCommand(scope: AgencyPayrollRunScope, onAsyncTerminal?: () => unknown) {
  const [runMutation] = useRunPayrollRunCommandMutation();
  const [offCycleMutation] = useCreateOffCyclePayrollRunMutation();
  const [getOperation] = useLazyGetAgencyPayrollOperationQuery();
  const { watch } = usePayrollOperations();
  const [activeIntent, setActiveIntent] = useState<PayrollRunCommandName | null>(null);
  const [error, setError] = useState<PayrollRunCommandError | null>(null);
  const runFlight = useRef<Flight | null>(null);
  const offCycleFlight = useRef<Flight | null>(null);
  const stops = useRef(new Set<() => void>());
  const terminalRefreshFrames = useRef(new Set<number>());
  const asyncTerminalRef = useRef(onAsyncTerminal);
  asyncTerminalRef.current = onAsyncTerminal;
  const scopeKey = `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${scope.mode}`;
  const liveScopeKey = useRef(scopeKey);
  if (liveScopeKey.current !== scopeKey) {
    liveScopeKey.current = scopeKey;
    runFlight.current = null;
    offCycleFlight.current = null;
  }

  useEffect(() => {
    setActiveIntent(null);
    setError(null);
    return () => {
      stops.current.forEach((stop) => stop());
      stops.current.clear();
      if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
        terminalRefreshFrames.current.forEach((frame) => window.cancelAnimationFrame(frame));
      }
      terminalRefreshFrames.current.clear();
    };
  }, [scopeKey]);

  const refreshAfterTerminalPaint = (commandScopeKey: string) => {
    const refresh = asyncTerminalRef.current;
    if (!refresh) return;
    const invoke = () => {
      if (liveScopeKey.current === commandScopeKey) refresh();
    };
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      invoke();
      return;
    }
    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      terminalRefreshFrames.current.delete(frame);
      invoke();
    });
    terminalRefreshFrames.current.add(frame);
  };

  const beginWatching = (operation: PayrollOperation, commandScopeKey: string, onTerminal: () => void): boolean => {
    if (liveScopeKey.current !== commandScopeKey || ["succeeded", "failed", "dead"].includes(operation.state)) return false;
    let stop: () => void = () => undefined;
    stop = watch(scope, operation.operationId,
      () => getOperation({ ...scope, operationId: operation.operationId }, false).unwrap(),
      () => {
        stops.current.delete(stop);
        if (liveScopeKey.current === commandScopeKey) {
          onTerminal();
          refreshAfterTerminalPaint(commandScopeKey);
        }
      });
    stops.current.add(stop);
    return true;
  };

  const execute = (
    flightRef: MutableRefObject<Flight | null>,
    key: string,
    intent: PayrollRunCommandName | null,
    dispatch: () => Promise<PayrollOperation>,
  ): Promise<PayrollOperation> => {
    const current = flightRef.current;
    if (current) {
      return current.key === key
        ? current.promise
        : Promise.reject(new PayrollRunCommandError("OPERATION_IN_PROGRESS"));
    }
    setError(null);
    if (intent) setActiveIntent(intent);
    const commandScopeKey = scopeKey;
    let watching = false;
    const promise = dispatch().then((operation) => {
      watching = beginWatching(operation, commandScopeKey, () => {
        if (flightRef.current?.promise === promise) flightRef.current = null;
        if (intent) setActiveIntent(null);
      });
      return operation;
    }).catch((value) => {
      const mapped = normalizeError(value);
      if (liveScopeKey.current === commandScopeKey) setError(mapped);
      throw mapped;
    }).finally(() => {
      if (!watching && flightRef.current?.promise === promise) flightRef.current = null;
      if (!watching && intent && liveScopeKey.current === commandScopeKey) setActiveIntent(null);
    });
    flightRef.current = { key, promise };
    return promise;
  };

  const sameScope = (args: AgencyPayrollRunScope) => args.audience === scope.audience
    && args.actorUid === scope.actorUid && args.agencyId === scope.agencyId
    && args.mode === scope.mode;

  const runCommand = (args: PayrollRunCommandArgs): Promise<PayrollOperation> => sameScope(args)
    ? execute(runFlight, args.idempotencyKey, args.command, () => runMutation(args).unwrap())
    : Promise.reject(new PayrollRunCommandError("REQUEST_FAILED"));
  const createOffCycleRun = (args: CreateOffCyclePayrollArgs): Promise<PayrollOperation> => sameScope(args)
    ? execute(offCycleFlight, args.idempotencyKey, null, () => offCycleMutation(args).unwrap())
    : Promise.reject(new PayrollRunCommandError("REQUEST_FAILED"));

  return { runCommand, createOffCycleRun, activeIntent, error };
}
