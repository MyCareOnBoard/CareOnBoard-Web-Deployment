import { useLayoutEffect, useRef, useState } from "react";
import { useCheckOnboard } from "./useCheckOnboard";
import { registerPayrollOnboardTeardown } from "./payrollOnboardSession";

export function CheckOnboardModal({ requestSession, onRefetch }: { requestSession: () => Promise<{ link: string; expiresAt?: string }>; onRefetch: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const starting = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const { open, busy } = useCheckOnboard(onRefetch, () => { if (mounted.current) trigger.current?.focus(); });

  useLayoutEffect(() => {
    const unregister = registerPayrollOnboardTeardown(() => { generation.current += 1; });
    return () => { mounted.current = false; generation.current += 1; unregister(); };
  }, []);

  const continueOnboard = async () => {
    if (starting.current) return;
    starting.current = true;
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
    }
  };

  return <div className="space-y-2"><button ref={trigger} type="button" disabled={busy} onClick={() => void continueOnboard()} className="rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c] disabled:opacity-60">{busy ? "Opening secure setup..." : "Continue secure setup"}</button>{error && <p role="alert" className="text-sm text-[#8b2d2d]">{error}</p>}</div>;
}
