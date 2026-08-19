import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCheckOnboard } from "./useCheckOnboard";
import { registerPayrollOnboardTeardown } from "./payrollOnboardSession";

export function CheckOnboardModal({ requestSession, onRefetch, actionLabel = "Continue secure setup", openingLabel = "Opening secure setup..." }: { requestSession: () => Promise<{ link: string; expiresAt?: string }>; onRefetch: () => void; actionLabel?: string; openingLabel?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const starting = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const onRefetchRef = useRef(onRefetch);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  useLayoutEffect(() => { onRefetchRef.current = onRefetch; }, [onRefetch]);
  const handleClosed = useCallback(() => { onRefetchRef.current(); if (mounted.current) trigger.current?.focus(); }, []);
  const { open, busy: sdkBusy } = useCheckOnboard(onRefetch, handleClosed);
  const busy = requesting || sdkBusy;

  useLayoutEffect(() => {
    mounted.current = true;
    const unregister = registerPayrollOnboardTeardown(() => { generation.current += 1; });
    return () => { mounted.current = false; generation.current += 1; unregister(); };
  }, []);

  const continueOnboard = async () => {
    if (starting.current) return;
    starting.current = true;
    setRequesting(true);
    setError(null);
    const current = ++generation.current;
    try {
      const session = await requestSession();
      if (!mounted.current || generation.current !== current) return;
      await open(session.link, session.expiresAt);
    } catch {
      if (mounted.current) {
        setError("Secure setup could not be opened. Please try again.");
        trigger.current?.focus();
      }
    } finally {
      starting.current = false;
      if (mounted.current) setRequesting(false);
    }
  };

  return <div className="space-y-2"><button ref={trigger} type="button" disabled={busy} aria-busy={busy} onClick={() => void continueOnboard()} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c] disabled:opacity-60">{busy ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />{openingLabel}</span> : actionLabel}</button>{error && <p role="alert" className="text-sm text-[#8b2d2d]">{error}</p>}</div>;
}
