import { useCallback, useEffect, useRef, useState } from "react";
import { loadCheckOnboard } from "./loadCheckOnboard";
import type { CheckOnboardInstance } from "./checkOnboard.types";
import { registerPayrollOnboardTeardown } from "./payrollOnboardSession";

const LOAD_CANCELLED = Symbol("check-onboard-load-cancelled");

export function useCheckOnboard(onRefetch: () => void, onRestoreFocus?: () => void, onSdkClose?: () => void) {
  const instance = useRef<CheckOnboardInstance | null>(null);
  const timer = useRef<number | null>(null);
  const cancelPendingLoad = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const notified = useRef(false);
  const sdkCloseNotified = useRef(false);
  const closing = useRef(false);
  const suppressCloseNotification = useRef(false);
  const [busy, setBusy] = useState(false);

  const cleanup = useCallback((restoreFocus: boolean) => {
    generation.current += 1;
    cancelPendingLoad.current?.();
    cancelPendingLoad.current = null;
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
      onRestoreFocus?.();
    }
  }, [onRestoreFocus]);
  const close = useCallback(() => cleanup(true), [cleanup]);
  const notifySdkClose = useCallback(() => {
    if (sdkCloseNotified.current) return;
    sdkCloseNotified.current = true;
    onSdkClose?.();
  }, [onSdkClose]);
  const cancelPending = useCallback(() => {
    if (instance.current) return;
    generation.current += 1;
    cancelPendingLoad.current?.();
    cancelPendingLoad.current = null;
    setBusy(false);
  }, []);
  useEffect(() => { const unregister = registerPayrollOnboardTeardown(() => cleanup(false)); return () => { unregister(); cleanup(false); }; }, [cleanup]);
  const open = useCallback(async (link: string, expiresAt?: string) => {
    cleanup(false);
    notified.current = false;
    sdkCloseNotified.current = false;
    const current = generation.current;
    setBusy(true);
    let cancelLoad: (() => void) | null = null;
    try {
      const expiry = expiresAt ? Date.parse(expiresAt) : undefined;
      if (!link || (expiry !== undefined && (!Number.isFinite(expiry) || expiry <= Date.now()))) throw new Error("A fresh onboarding session is required.");
      const cancelled = new Promise<typeof LOAD_CANCELLED>((resolve) => {
        cancelLoad = () => resolve(LOAD_CANCELLED);
        cancelPendingLoad.current = cancelLoad;
      });
      const Check = await Promise.race([loadCheckOnboard(), cancelled]);
      if (Check === LOAD_CANCELLED || generation.current !== current) return;
      const handler = Check.create({ link, appearance: { primaryColor: "#00b4b8" }, onClose: () => { if (generation.current === current) { notifySdkClose(); close(); } }, onEvent: () => { if (generation.current === current) onRefetch(); } });
      if (generation.current !== current) { handler.close(); return; }
      instance.current = handler;
      handler.open();
      handler._show?.();
      setBusy(false);
      if (expiry) timer.current = window.setTimeout(close, expiry - Date.now());
    } catch (error) {
      if (generation.current !== current) return;
      setBusy(false);
      throw error;
    } finally {
      if (cancelPendingLoad.current === cancelLoad) cancelPendingLoad.current = null;
    }
  }, [cleanup, close, notifySdkClose, onRefetch]);
  return { open, close, cancelPending, busy };
}
