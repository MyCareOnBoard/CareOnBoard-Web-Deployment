import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { PayrollOperation, PayrollScope } from "../model/types";

type Context = { watch(scope: PayrollScope, operationId: string, poll: () => Promise<PayrollOperation>, onTerminal?: () => void): () => void };
const PayrollOperationContext = createContext<Context | null>(null);
const terminal = new Set(["succeeded", "failed", "dead"]);
export function PayrollOperationProvider({ children }: { children: ReactNode }) {
  const watchers = useRef(new Map<string, { stopped: boolean; timer?: number; poll: () => Promise<PayrollOperation>; attempts: number; onTerminal?: () => void }>());
  const stop = (operationId: string) => { const current = watchers.current.get(operationId); if (!current) return; current.stopped = true; if (current.timer) clearTimeout(current.timer); watchers.current.delete(operationId); };
  useEffect(() => { const resume = () => { if (document.visibilityState === "visible") watchers.current.forEach((_, id) => run(id)); }; document.addEventListener("visibilitychange", resume); return () => { document.removeEventListener("visibilitychange", resume); [...watchers.current.keys()].forEach(stop); }; }, []);
  const settle = (operationId: string, current: { stopped: boolean; onTerminal?: () => void }) => {
    if (current.stopped || watchers.current.get(operationId) !== current) return;
    stop(operationId);
    current.onTerminal?.();
  };
  const run = async (operationId: string) => { const current = watchers.current.get(operationId); if (!current || current.stopped || document.visibilityState === "hidden") return; if (current.attempts >= 3) { settle(operationId, current); return; } current.attempts += 1; try { const operation = await current.poll(); if (current.stopped || watchers.current.get(operationId) !== current || terminal.has(operation.state)) { if (terminal.has(operation.state)) settle(operationId, current); return; } current.timer = window.setTimeout(() => void run(operationId), operation.pollAfterMs ?? 1000); } catch { if (!current.stopped && watchers.current.get(operationId) === current) settle(operationId, current); } };
  const watch = (scope: PayrollScope, operationId: string, poll: () => Promise<PayrollOperation>, onTerminal?: () => void) => {
    const key = `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${operationId}`;
    stop(key);
    watchers.current.set(key, { stopped: false, poll, attempts: 0, onTerminal });
    void run(key); return () => stop(key);
  };
  return <PayrollOperationContext.Provider value={{ watch }}>{children}</PayrollOperationContext.Provider>;
}
export const usePayrollOperations = () => { const value = useContext(PayrollOperationContext); if (!value) throw new Error("PayrollOperationProvider is required."); return value; };
