import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { PayrollOperation, PayrollScope } from "../model/types";

type Context = { watch(scope: PayrollScope, operationId: string, poll: () => Promise<PayrollOperation>, onTerminal?: (operation: PayrollOperation) => void): () => void };
const PayrollOperationContext = createContext<Context | null>(null);
const terminal = new Set(["succeeded", "needs_attention", "failed", "dead"]);
const retryAfterMs = 1000;
const maxRetryAfterMs = 30000;
export function PayrollOperationProvider({ children }: { children: ReactNode }) {
  const watchers = useRef(new Map<string, { stopped: boolean; timer?: number; inFlight: boolean; consecutiveErrors: number; poll: () => Promise<PayrollOperation>; onTerminal?: (operation: PayrollOperation) => void }>());
  const clearTimer = (current: { timer?: number }) => { if (current.timer !== undefined) { clearTimeout(current.timer); current.timer = undefined; } };
  const stop = (operationId: string) => { const current = watchers.current.get(operationId); if (!current) return; current.stopped = true; clearTimer(current); watchers.current.delete(operationId); };
  useEffect(() => { const resume = () => { if (document.visibilityState === "visible") watchers.current.forEach((current, id) => { if (current.inFlight) return; clearTimer(current); void run(id); }); }; document.addEventListener("visibilitychange", resume); return () => { document.removeEventListener("visibilitychange", resume); [...watchers.current.keys()].forEach(stop); }; }, []);
  const settle = (operationId: string, current: { stopped: boolean; onTerminal?: (operation: PayrollOperation) => void }, operation: PayrollOperation) => {
    if (current.stopped || watchers.current.get(operationId) !== current) return;
    stop(operationId);
    current.onTerminal?.(operation);
  };
  const schedule = (operationId: string, current: { stopped: boolean; timer?: number }, delay: number) => { if (current.stopped || watchers.current.get(operationId) !== current) return; clearTimer(current); current.timer = window.setTimeout(() => { current.timer = undefined; void run(operationId); }, delay); };
  const run = async (operationId: string) => { const current = watchers.current.get(operationId); if (!current || current.stopped || current.inFlight || document.visibilityState === "hidden") return; current.inFlight = true; try { const operation = await current.poll(); if (current.stopped || watchers.current.get(operationId) !== current) return; current.inFlight = false; if (terminal.has(operation.state)) { settle(operationId, current, operation); return; } current.consecutiveErrors = 0; schedule(operationId, current, operation.pollAfterMs ?? retryAfterMs); } catch { if (current.stopped || watchers.current.get(operationId) !== current) return; current.inFlight = false; current.consecutiveErrors += 1; schedule(operationId, current, Math.min(retryAfterMs * 2 ** (current.consecutiveErrors - 1), maxRetryAfterMs)); } };
  const watch = (scope: PayrollScope, operationId: string, poll: () => Promise<PayrollOperation>, onTerminal?: (operation: PayrollOperation) => void) => {
    const key = `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${operationId}`;
    stop(key);
    watchers.current.set(key, { stopped: false, inFlight: false, consecutiveErrors: 0, poll, onTerminal });
    void run(key); return () => stop(key);
  };
  return <PayrollOperationContext.Provider value={{ watch }}>{children}</PayrollOperationContext.Provider>;
}
export const usePayrollOperations = () => { const value = useContext(PayrollOperationContext); if (!value) throw new Error("PayrollOperationProvider is required."); return value; };
