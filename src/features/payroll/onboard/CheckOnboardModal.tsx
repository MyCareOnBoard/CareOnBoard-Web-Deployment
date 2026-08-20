import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCheckOnboard } from "./useCheckOnboard";
import { registerPayrollOnboardTeardown } from "./payrollOnboardSession";

export type CheckOnboardLoadingDialogConfig = Readonly<{
  preparing: Readonly<{ title: string; description: string }>;
  opening: Readonly<{ title: string; description: string }>;
}>;

type LaunchPhase = "idle" | "requesting-session" | "loading-sdk";

function CheckOnboardLoadingDialog({ open, copy, onAfterClose }: {
  open: boolean;
  copy: { title: string; description: string };
  onAfterClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="motion-reduce:animate-none motion-reduce:backdrop-blur-none"
        className="w-[min(92vw,380px)] border border-[#dce8e8] px-8 py-9 text-center motion-reduce:animate-none"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onAfterClose();
        }}
      >
        <div aria-hidden="true" className="relative mx-auto grid h-[72px] w-[72px] place-items-center">
          <span data-testid="check-onboard-loading-ring" className="absolute inset-0 rounded-full border-4 border-[#dff4f4] border-r-[var(--main-color)] border-t-[var(--main-color)] motion-safe:animate-spin" />
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e8f8f8] text-[#006f73]">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" aria-busy="true" className="mt-5">
          <DialogTitle className="text-xl leading-7">{copy.title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[#5d626b]">{copy.description}</DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CheckOnboardModal({
  requestSession,
  onRefetch,
  actionLabel = "Continue secure setup",
  openingLabel = "Opening secure setup...",
  launchMode = "embedded",
  autoStartKey,
  onAutoStartConsumed,
  onClosed,
  cancelPending = false,
  loadingDialog,
}: {
  requestSession: () => Promise<{ link: string; expiresAt?: string }>;
  onRefetch: () => void;
  actionLabel?: string;
  openingLabel?: string;
  launchMode?: "embedded" | "redirect";
  autoStartKey?: string;
  onAutoStartConsumed?: (key: string) => void;
  onClosed?: () => void;
  cancelPending?: boolean;
  loadingDialog?: CheckOnboardLoadingDialogConfig;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const activeLaunchRef = useRef<number | null>(null);
  const autoStartedKeyRef = useRef<string | undefined>(undefined);
  const restoreTriggerAfterDialogRef = useRef(false);
  const pendingDialogErrorRef = useRef<string | null>(null);
  const onRefetchRef = useRef(onRefetch);
  const onClosedRef = useRef(onClosed);
  const [error, setError] = useState<string | null>(null);
  const [launchPhase, setLaunchPhase] = useState<LaunchPhase>("idle");
  const [autoStartTick, setAutoStartTick] = useState(0);

  useLayoutEffect(() => { onRefetchRef.current = onRefetch; }, [onRefetch]);
  useLayoutEffect(() => { onClosedRef.current = onClosed; }, [onClosed]);
  const handleClosed = useCallback(() => {
    onRefetchRef.current();
    if (mounted.current) trigger.current?.focus();
  }, []);
  const handleSdkClosed = useCallback(() => { onClosedRef.current?.(); }, []);
  const { open, cancelPending: cancelPendingOpen, busy: sdkBusy } = useCheckOnboard(onRefetch, handleClosed, handleSdkClosed);
  const busy = launchPhase !== "idle" || sdkBusy;
  const sdkBusyRef = useRef(sdkBusy);
  useLayoutEffect(() => { sdkBusyRef.current = sdkBusy; }, [sdkBusy]);

  const handleLoadingDialogClosed = useCallback(() => {
    const pendingError = pendingDialogErrorRef.current;
    const restoreFocus = restoreTriggerAfterDialogRef.current;
    pendingDialogErrorRef.current = null;
    restoreTriggerAfterDialogRef.current = false;
    if (pendingError) setError(pendingError);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  const retirePendingLaunch = useCallback(() => {
    if (activeLaunchRef.current === null && !sdkBusyRef.current) return;
    generation.current += 1;
    activeLaunchRef.current = null;
    restoreTriggerAfterDialogRef.current = false;
    pendingDialogErrorRef.current = null;
    if (mounted.current) {
      setLaunchPhase("idle");
      setAutoStartTick((tick) => tick + 1);
    }
    cancelPendingOpen();
  }, [cancelPendingOpen]);

  useLayoutEffect(() => {
    if (cancelPending) retirePendingLaunch();
  }, [cancelPending, retirePendingLaunch]);

  useLayoutEffect(() => {
    mounted.current = true;
    const unregister = registerPayrollOnboardTeardown(retirePendingLaunch);
    return () => {
      mounted.current = false;
      generation.current += 1;
      activeLaunchRef.current = null;
      restoreTriggerAfterDialogRef.current = false;
      pendingDialogErrorRef.current = null;
      unregister();
      cancelPendingOpen();
    };
  }, [cancelPendingOpen, retirePendingLaunch]);

  const continueOnboard = useCallback((onAccepted?: () => void) => {
    if (activeLaunchRef.current !== null) return false;
    const current = ++generation.current;
    activeLaunchRef.current = current;
    restoreTriggerAfterDialogRef.current = false;
    pendingDialogErrorRef.current = null;
    onAccepted?.();
    setLaunchPhase("requesting-session");
    setError(null);
    void (async () => {
      try {
        const session = await requestSession();
        if (!mounted.current || generation.current !== current) return;
        if (launchMode === "redirect") {
          window.location.assign(session.link);
          return;
        }
        setLaunchPhase("loading-sdk");
        await open(session.link, session.expiresAt);
      } catch {
        if (!mounted.current || generation.current !== current) return;
        if (loadingDialog) {
          restoreTriggerAfterDialogRef.current = true;
          pendingDialogErrorRef.current = "Secure setup could not be opened. Please try again.";
        } else {
          setError("Secure setup could not be opened. Please try again.");
          trigger.current?.focus();
        }
      } finally {
        if (activeLaunchRef.current !== current) return;
        activeLaunchRef.current = null;
        if (mounted.current) {
          setLaunchPhase("idle");
          setAutoStartTick((tick) => tick + 1);
        }
      }
    })();
    return true;
  }, [launchMode, loadingDialog, open, requestSession]);

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

  const loadingCopy = launchPhase === "loading-sdk" || sdkBusy ? loadingDialog?.opening : loadingDialog?.preparing;

  return (
    <div className="space-y-2">
      <button ref={trigger} type="button" disabled={busy} aria-busy={busy} onClick={() => void continueOnboard()} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c] disabled:opacity-60">
        {busy && !loadingDialog ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />{openingLabel}</span> : actionLabel}
      </button>
      {loadingDialog && loadingCopy ? <CheckOnboardLoadingDialog open={busy} copy={loadingCopy} onAfterClose={handleLoadingDialogClosed} /> : null}
      {error && <p role="alert" className="text-sm text-[#8b2d2d]">{error}</p>}
    </div>
  );
}
