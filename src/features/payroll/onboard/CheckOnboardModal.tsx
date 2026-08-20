import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCheckOnboard } from "./useCheckOnboard";
import { registerPayrollOnboardTeardown } from "./payrollOnboardSession";

export function CheckOnboardModal({ requestSession, onRefetch, actionLabel = "Continue secure setup", openingLabel = "Opening secure setup...", launchMode = "embedded", autoStartKey, onAutoStartConsumed, cancelPending = false }: { requestSession: () => Promise<{ link: string; expiresAt?: string }>; onRefetch: () => void; actionLabel?: string; openingLabel?: string; launchMode?: "embedded" | "redirect"; autoStartKey?: string; onAutoStartConsumed?: (key: string) => void; cancelPending?: boolean }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const starting = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const autoStartedKeyRef = useRef<string | undefined>(undefined);
  const onRefetchRef = useRef(onRefetch);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [autoStartTick, setAutoStartTick] = useState(0);
  useLayoutEffect(() => { onRefetchRef.current = onRefetch; }, [onRefetch]);
  const handleClosed = useCallback(() => { onRefetchRef.current(); if (mounted.current) trigger.current?.focus(); }, []);
  const { open, cancelPending: cancelPendingOpen, busy: sdkBusy } = useCheckOnboard(onRefetch, handleClosed);
  const busy = requesting || sdkBusy;

  useLayoutEffect(() => { if (cancelPending) cancelPendingOpen(); }, [cancelPending, cancelPendingOpen]);

  useLayoutEffect(() => {
    mounted.current = true;
    const unregister = registerPayrollOnboardTeardown(() => { generation.current += 1; });
    return () => { mounted.current = false; generation.current += 1; unregister(); };
  }, []);

  const continueOnboard = useCallback((onAccepted?: () => void) => {
    if (starting.current) return false;
    starting.current = true;
    onAccepted?.();
    setRequesting(true);
    setError(null);
    const current = ++generation.current;
    void (async () => {
      try {
        const session = await requestSession();
        if (!mounted.current || generation.current !== current) return;
        if (launchMode === "redirect") {
          window.location.assign(session.link);
          return;
        }
        await open(session.link, session.expiresAt);
      } catch {
        if (mounted.current) {
          setError("Secure setup could not be opened. Please try again.");
          trigger.current?.focus();
        }
      } finally {
        starting.current = false;
        if (mounted.current) {
          setRequesting(false);
          if (generation.current === current) setAutoStartTick((tick) => tick + 1);
        }
      }
    })();
    return true;
  }, [launchMode, open, requestSession]);

  useEffect(() => {
    if (!autoStartKey || autoStartedKeyRef.current === autoStartKey) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !mounted.current || autoStartedKeyRef.current === autoStartKey) return;
      continueOnboard(() => {
        autoStartedKeyRef.current = autoStartKey;
        onAutoStartConsumed?.(autoStartKey);
      });
    });
    return () => { cancelled = true; };
  }, [autoStartKey, autoStartTick, continueOnboard, onAutoStartConsumed]);

  return <div className="space-y-2"><button ref={trigger} type="button" disabled={busy} aria-busy={busy} onClick={() => void continueOnboard()} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c] disabled:opacity-60">{busy ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />{openingLabel}</span> : actionLabel}</button>{error && <p role="alert" className="text-sm text-[#8b2d2d]">{error}</p>}</div>;
}
