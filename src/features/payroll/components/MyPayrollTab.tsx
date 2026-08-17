import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useDispatch } from "react-redux";
import { employeePayrollApi, useCreateEmployeeOnboardSessionMutation, useRunEmployeePayrollCommandMutation } from "../api/employeePayrollEndpoints";
import type { EmployeePayrollAction, EmployeePayrollScope } from "../model/types";
import { employeePayrollBlockerMessage } from "./employeePayrollCopy";
import { Loader2 } from "lucide-react";

const CheckOnboardModal = lazy(async () => {
  const module = await import("../onboard/CheckOnboardModal");
  return { default: module.CheckOnboardModal };
});
const EmployeePayrollPrerequisitesModal = lazy(() => import("./EmployeePayrollPrerequisitesModal"));

const pollingStates = new Set(["queued", "waiting", "awaiting_provider"]);

function documentIsFocused() {
  return typeof document === "undefined" || (document.visibilityState !== "hidden" && document.hasFocus());
}

function errorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return (error as { status?: unknown }).status;
}

function samePayrollScope(left: EmployeePayrollScope, right: EmployeePayrollScope) {
  return left.actorUid === right.actorUid
    && left.agencyId === right.agencyId
    && left.employmentId === right.employmentId;
}

export default function MyPayrollTab({ scope, active }: { scope: EmployeePayrollScope; active: boolean }) {
  const dispatch = useDispatch();
  const [focused, setFocused] = useState(documentIsFocused);
  const [pendingAction, setPendingAction] = useState<EmployeePayrollAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [prerequisitesOpen, setPrerequisitesOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const actionInFlight = useRef(false);
  const actionToken = useRef(0);
  const mounted = useRef(true);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const coalescedRefetch = useRef({ employmentId: "", inFlight: false, trailing: false });
  const queryArg = active && scope.employmentId ? scope : skipToken;
  const queryState = employeePayrollApi.endpoints.getEmployeePayrollSetup.useQueryState(queryArg);
  const shouldPoll = active && focused && pollingStates.has(queryState.currentData?.setup.state ?? "");
  const subscription = employeePayrollApi.endpoints.getEmployeePayrollSetup.useQuerySubscription(queryArg, {
    pollingInterval: shouldPoll ? 5_000 : 0,
    skipPollingIfUnfocused: true,
  });
  const [runCommand] = useRunEmployeePayrollCommandMutation();
  const [createOnboardSession] = useCreateEmployeeOnboardSessionMutation();

  useEffect(() => {
    const updateFocus = () => {
      const nextFocused = documentIsFocused();
      setFocused(nextFocused);
      dispatch(nextFocused ? employeePayrollApi.internalActions.onFocus() : employeePayrollApi.internalActions.onFocusLost());
    };
    updateFocus();
    window.addEventListener("focus", updateFocus);
    window.addEventListener("blur", updateFocus);
    document.addEventListener("visibilitychange", updateFocus);
    return () => {
      window.removeEventListener("focus", updateFocus);
      window.removeEventListener("blur", updateFocus);
      document.removeEventListener("visibilitychange", updateFocus);
    };
  }, [dispatch]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      actionToken.current += 1;
      coalescedRefetch.current.trailing = false;
    };
  }, []);

  useEffect(() => {
    actionToken.current += 1;
    actionInFlight.current = false;
    setPendingAction(null);
    setActionError(null);
    setOnboardingOpen(false);
    setPrerequisitesOpen(false);
    setScanning(false);
    coalescedRefetch.current = { employmentId: scope.employmentId, inFlight: false, trailing: false };
  }, [scope.actorUid, scope.agencyId, scope.employmentId]);

  const refetchCoalesced = useCallback(() => {
    const state = coalescedRefetch.current;
    if (!mounted.current || state.employmentId !== scope.employmentId) return;
    if (state.inFlight) {
      state.trailing = true;
      return;
    }
    state.inFlight = true;
    void subscription.refetch().catch(() => undefined).finally(() => {
      if (!mounted.current || coalescedRefetch.current !== state) return;
      state.inFlight = false;
      if (state.trailing) {
        state.trailing = false;
        refetchCoalesced();
      }
    });
  }, [scope.employmentId, subscription]);

  const hasPrerequisites = (payroll: NonNullable<typeof queryState.currentData>) => payroll.prerequisites.missingFieldCodes.includes("legalName") || payroll.prerequisites.invalidFieldCodes.includes("email");

  const runAction = async (command: EmployeePayrollAction, profile?: { legalName: string; email: string | null }) => {
    const current = queryState.currentData;
    if (!current || actionInFlight.current) return;
    const actionScope = { ...scope };
    const token = ++actionToken.current;
    const isCurrentAction = () => mounted.current
      && actionToken.current === token
      && samePayrollScope(currentScope.current, actionScope);
    actionInFlight.current = true;
    setPendingAction(command);
    setActionError(null);
    try {
      await runCommand({
        ...scope,
        command,
        projectionRevision: current.projectionRevision,
        idempotencyKey: crypto.randomUUID(),
        ...(profile ? { profile } : {}),
      }).unwrap();
      if (!isCurrentAction()) return;
      if (command === "start_provisioning" && profile) setPrerequisitesOpen(false);
    } catch (error) {
      if (!isCurrentAction()) return;
      if (errorStatus(error) === 409) {
        try {
          const refreshed = await subscription.refetch().unwrap();
          if (!isCurrentAction()) return;
          setPrerequisitesOpen(hasPrerequisites(refreshed));
        } catch {
          if (!isCurrentAction()) return;
          setActionError("Payroll setup could not be updated. Please try again.");
          return;
        }
        if (!isCurrentAction()) return;
        setActionError("Payroll setup was updated. Please review and try again.");
      } else {
        setActionError("Payroll setup could not be updated. Please try again.");
      }
    } finally {
      if (!isCurrentAction()) return;
      actionInFlight.current = false;
      setPendingAction(null);
    }
  };

  const startPayroll = async () => {
    if (actionInFlight.current || scanning) return;
    const actionScope = { ...scope };
    const token = ++actionToken.current;
    const isCurrent = () => mounted.current && actionToken.current === token && samePayrollScope(currentScope.current, actionScope);
    actionInFlight.current = true;
    setScanning(true);
    setActionError(null);
    try {
      const fresh = await subscription.refetch().unwrap();
      if (!isCurrent()) return;
      if (fresh.agencyIntegration.state === "missing") return;
      if (hasPrerequisites(fresh)) { setPrerequisitesOpen(true); return; }
      actionInFlight.current = false;
      setScanning(false);
      await runAction("start_provisioning");
    } catch {
      if (isCurrent()) setActionError("Payroll setup could not be updated. Please try again.");
    } finally {
      if (!isCurrent()) return;
      if (!pendingAction) actionInFlight.current = false;
      setScanning(false);
    }
  };

  const requestOnboardSession = useCallback(async () => {
    const current = queryState.currentData;
    if (!current) throw new Error("Payroll setup is unavailable.");
    const session = await createOnboardSession({ ...scope, projectionRevision: current.projectionRevision }).unwrap();
    return { link: session.url, expiresAt: session.expiresAt };
  }, [createOnboardSession, queryState.currentData, scope]);

  if (!active) return null;

  if (!scope.employmentId) {
    return <section aria-labelledby="my-payroll-heading" className="border-b border-[#e5e7eb] py-6"><h2 id="my-payroll-heading" className="text-xl font-semibold text-[#10141a]">My Payroll</h2><p role="alert" className="mt-3 text-sm text-[#5d626b]">Payroll setup is not available for this account.</p></section>;
  }

  if (!queryState.currentData && (queryState.isUninitialized || queryState.isLoading || queryState.isFetching)) {
    return <section aria-label="Loading payroll setup" aria-busy="true" role="status" className="min-h-[188px] animate-pulse border-b border-[#e5e7eb] py-6"><div className="h-3 w-24 rounded bg-[#dfe7e7]" /><div className="mt-3 h-6 w-48 rounded bg-[#e8eeee]" /><div className="mt-5 h-4 w-full max-w-md rounded bg-[#e8eeee]" /></section>;
  }

  if (!queryState.currentData && queryState.isError) {
    return <section aria-labelledby="my-payroll-heading" className="border-b border-[#e5e7eb] py-6"><h2 id="my-payroll-heading" className="text-xl font-semibold text-[#10141a]">My Payroll</h2><p role="alert" className="mt-3 text-sm text-[#8b2d2d]">Payroll setup could not be loaded.</p><button type="button" onClick={() => void subscription.refetch()} className="mt-3 text-sm font-semibold text-[#006f73] underline">Try again</button></section>;
  }

  const payroll = queryState.currentData;
  if (!payroll) return null;
  const { setup, capabilities } = payroll;
  const integrationMissing = payroll.agencyIntegration.state === "missing";
  const busy = pendingAction !== null || scanning;
  const progress = pollingStates.has(setup.state);
  const needsAttention = setup.state === "blocked" || setup.state === "needs_attention";
  const canContinue = setup.state === "ready" && (setup.onboardingStatus === "blocking" || setup.onboardingStatus === "needs_attention") && capabilities.createEmployeeOnboardSession;

  return <section aria-labelledby="my-payroll-heading" className="border-b border-[#e5e7eb] py-6">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006f73]">Payroll</p>
    <h2 id="my-payroll-heading" className="mt-1 text-xl font-semibold text-[#10141a]">My Payroll</h2>
    {queryState.isFetching && <span role="status" aria-label="Refreshing payroll setup" className="ml-2 inline-flex align-middle"><Loader2 aria-hidden="true" className="h-4 w-4 text-[#006f73] motion-safe:animate-spin" /></span>}
    {integrationMissing ? <p role="status" className="mt-3 text-sm text-[#5d626b]">Your agency must complete Payroll Setup before you can start your personal payroll setup.</p> : setup.state === "not_started" && <p className="mt-3 text-sm text-[#5d626b]">Start payroll setup when you are ready.</p>}
    {progress && <p role="status" aria-label="Payroll setup is in progress" aria-live="polite" className="mt-3 text-sm text-[#5d626b]">Payroll setup is in progress. This page will update automatically.</p>}
    {needsAttention && <div role="status" aria-live="polite" className="mt-3 space-y-1 text-sm text-[#5d626b]">{setup.blockers.map((blocker) => <p key={blocker}>{employeePayrollBlockerMessage(blocker)}</p>)}</div>}
    {setup.state === "ready" && setup.onboardingStatus === "completed" && <p role="status" className="mt-3 text-sm text-[#176b4d]">Payroll setup is complete.</p>}
    {actionError && <p role="alert" className="mt-3 text-sm text-[#8b2d2d]">{actionError}</p>}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {!integrationMissing && setup.state === "not_started" && capabilities.canStartProvisioning && <button type="button" disabled={busy} aria-busy={busy} onClick={() => void startPayroll()} className="inline-flex min-h-11 min-w-[13rem] items-center justify-center rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c] disabled:opacity-60">{scanning ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Scanning payroll details…</span> : pendingAction === "start_provisioning" ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Starting payroll setup…</span> : "Start payroll setup"}</button>}
      {!integrationMissing && needsAttention && capabilities.canRetryEmployeeSync && <button type="button" disabled={busy} onClick={() => void runAction("retry_employee_sync")} className="text-sm font-semibold text-[#006f73] underline disabled:opacity-60">{pendingAction === "retry_employee_sync" ? "Retrying payroll setup..." : "Retry payroll setup"}</button>}
      {!integrationMissing && canContinue && !onboardingOpen && <button type="button" onClick={() => setOnboardingOpen(true)} className="rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c]">Continue secure setup</button>}
      {!integrationMissing && canContinue && onboardingOpen && <Suspense fallback={<p role="status" className="text-sm text-[#5d626b]">Loading secure setup...</p>}><CheckOnboardModal requestSession={requestOnboardSession} onRefetch={refetchCoalesced} /></Suspense>}
    </div>
    {!integrationMissing && prerequisitesOpen && <Suspense fallback={<p role="status" aria-busy="true" className="mt-4 text-sm text-[#5d626b]">Loading payroll details…</p>}><EmployeePayrollPrerequisitesModal open values={payroll.prerequisites.values} missingFieldCodes={payroll.prerequisites.missingFieldCodes} invalidFieldCodes={payroll.prerequisites.invalidFieldCodes} isSubmitting={pendingAction === "start_provisioning"} error={actionError} onOpenChange={setPrerequisitesOpen} onSubmit={async (profile) => { await runAction("start_provisioning", profile); }} /></Suspense>}
  </section>;
}
