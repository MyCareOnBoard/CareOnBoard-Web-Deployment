import { useCallback, useEffect, useRef, useState } from "react";
import { loadCheckOnboard } from "./loadCheckOnboard";
import type { CheckOnboardInstance } from "./checkOnboard.types";
import { registerPayrollOnboardTeardown } from "./payrollOnboardSession";

export function useCheckOnboard(onRefetch: () => void, onClosed?: () => void) {
  const instance = useRef<CheckOnboardInstance | null>(null);
  const timer = useRef<number | null>(null);
  const generation = useRef(0);
  const notified = useRef(false);
  const closing = useRef(false);
  const suppressCloseNotification = useRef(false);
  const [busy, setBusy] = useState(false);

  const cleanup = useCallback((restoreFocus: boolean) => {
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;

    const handler = instance.current;
    instance.current = null;
    setBusy(false);

    // Some SDK implementations synchronously invoke onClose from close().  Detach
    // our reference first and suppress that nested cleanup so focus is restored once.
    if (handler && !closing.current) {
      closing.current = true;
      try {
        suppressCloseNotification.current = !restoreFocus;
        handler.close();
      } finally {
        suppressCloseNotification.current = false;
        closing.current = false;
      }
    }
    if (restoreFocus && !suppressCloseNotification.current && !notified.current) {
      notified.current = true;
      onClosed?.();
    }
  }, [onClosed]);
  const close = useCallback(() => cleanup(true), [cleanup]);
  useEffect(() => { const unregister = registerPayrollOnboardTeardown(close); return () => { unregister(); cleanup(false); }; }, [close, cleanup]);
  const open = useCallback(async (link: string, expiresAt?: string) => { cleanup(false); notified.current = false; const current = generation.current; setBusy(true); try { const expiry = expiresAt ? Date.parse(expiresAt) : undefined; if (!link || (expiry !== undefined && (!Number.isFinite(expiry) || expiry <= Date.now()))) throw new Error("A fresh onboarding session is required."); const Check = await loadCheckOnboard(); if (generation.current !== current) return; const handler = Check.create({ link, onClose: () => { if (generation.current === current) close(); }, onEvent: () => { if (generation.current === current) onRefetch(); } }); if (generation.current !== current) { handler.close(); return; } instance.current = handler; handler.open(); setBusy(false); if (expiry) timer.current = window.setTimeout(close, expiry - Date.now()); } catch (error) { if (generation.current === current) setBusy(false); throw error; } }, [cleanup, close, onRefetch]);
  return { open, close, busy };
}
