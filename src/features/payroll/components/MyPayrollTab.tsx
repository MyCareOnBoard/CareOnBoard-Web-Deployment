import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Building2, Loader2, UserRound, WalletCards } from "lucide-react";
import SettingsSectionCard from "@/pages/shared/settings/SettingsSectionCard";
import SettingsTabSkeleton from "@/pages/shared/settings/SettingsTabSkeleton";
import { useAppDispatch } from "@/store/redux/hooks";
import {
  employeePayrollApi,
  useCreateEmployeeOnboardSessionMutation,
  useReconcileEmployeeOnboardMutation,
  useRunEmployeePayrollCommandMutation,
} from "../api/employeePayrollEndpoints";
import type { EmployeePayrollAction, EmployeePayrollScope, EmployeePayrollSetupProjection } from "../model/types";
import { employeePayrollBlockerMessage } from "./employeePayrollCopy";
import { PayrollJourneyStep } from "./PayrollJourneyStep";

const CheckOnboardModal = lazy(async () => {
  const module = await import("../onboard/CheckOnboardModal");
  return { default: module.CheckOnboardModal };
});
const EmployeePayrollPrerequisitesModal = lazy(() => import("./EmployeePayrollPrerequisitesModal"));

const pollingStates = new Set(["queued", "waiting", "awaiting_provider"]);

const employeeOnboardLoadingDialog = {
  preparing: {
    title: "Preparing your payroll onboarding",
    description: "Creating a secure session with Check. Your setup will open automatically.",
  },
  opening: {
    title: "Opening your payroll onboarding",
    description: "Your secure session is ready. Connecting you to Check now.",
  },
} as const;

type AutoOnboardIntent = {
  key: string;
  scope: EmployeePayrollScope;
  baselineRevision: number;
};

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

function hasPrerequisites(payroll: EmployeePayrollSetupProjection) {
  return payroll.prerequisites.missingFieldCodes.includes("legalName")
    || payroll.prerequisites.invalidFieldCodes.includes("email");
}

export default function MyPayrollTab({ scope, active }: { scope: EmployeePayrollScope; active: boolean }) {
  const dispatch = useAppDispatch();
  const [focused, setFocused] = useState(documentIsFocused);
  const [pendingAction, setPendingAction] = useState<EmployeePayrollAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [prerequisitesOpen, setPrerequisitesOpen] = useState(false);
  const [autoOnboardIntent, setAutoOnboardIntent] = useState<AutoOnboardIntent | null>(null);
  const [scanning, setScanning] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationFailed, setReconciliationFailed] = useState(false);
  const actionInFlight = useRef(false);
  const actionToken = useRef(0);
  const reconciliationInFlight = useRef(false);
  const reconciliationToken = useRef(0);
  const payrollJourney = useRef<HTMLOListElement>(null);
  const wasReconciling = useRef(false);
  const mounted = useRef(true);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const queryArg = active && scope.employmentId ? scope : skipToken;
  const queryState = employeePayrollApi.endpoints.getEmployeePayrollSetup.useQueryState(queryArg);
  const payroll = queryState.currentData;
  const shouldPoll = active && focused && pollingStates.has(payroll?.setup.state ?? "");
  const subscription = employeePayrollApi.endpoints.getEmployeePayrollSetup.useQuerySubscription(queryArg, {
    pollingInterval: shouldPoll ? 5_000 : 0,
    skipPollingIfUnfocused: true,
  });
  const [runCommand] = useRunEmployeePayrollCommandMutation();
  const [createOnboardSession] = useCreateEmployeeOnboardSessionMutation();
  const [reconcileOnboard] = useReconcileEmployeeOnboardMutation();
  const canContinue = Boolean(
    payroll?.setup.state === "ready"
    && (payroll.setup.onboardingStatus === "blocking" || payroll.setup.onboardingStatus === "needs_attention")
    && payroll.capabilities.createEmployeeOnboardSession,
  );

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
      reconciliationToken.current += 1;
      reconciliationInFlight.current = false;
    };
  }, []);

  useEffect(() => {
    actionToken.current += 1;
    actionInFlight.current = false;
    setPendingAction(null);
    setActionError(null);
    setPrerequisitesOpen(false);
    setAutoOnboardIntent(null);
    setScanning(false);
    setReconciling(false);
    setReconciliationFailed(false);
    reconciliationToken.current += 1;
    reconciliationInFlight.current = false;
  }, [scope.actorUid, scope.agencyId, scope.employmentId]);

  useEffect(() => {
    if (reconciling) {
      payrollJourney.current?.focus();
    } else if (wasReconciling.current) {
      const retry = payrollJourney.current?.querySelector<HTMLButtonElement>("button:not([disabled])");
      (retry ?? payrollJourney.current)?.focus();
    }
    wasReconciling.current = reconciling;
  }, [reconciling]);

  useEffect(() => {
    if (!autoOnboardIntent) return;
    const terminalSetup = payroll && (
      payroll.agencyIntegration.state === "missing"
      || payroll.setup.state === "blocked"
      || payroll.setup.state === "needs_attention"
      || (payroll.setup.state === "ready" && payroll.setup.onboardingStatus === "completed")
    );
    if (!active || !samePayrollScope(autoOnboardIntent.scope, scope) || terminalSetup) setAutoOnboardIntent(null);
  }, [active, autoOnboardIntent, payroll, scope]);

  const runAction = async (command: EmployeePayrollAction, profile?: { legalName: string; email: string | null }) => {
    const current = queryState.currentData;
    if (!current || actionInFlight.current) return;
    const actionScope = { ...scope };
    const token = ++actionToken.current;
    const idempotencyKey = crypto.randomUUID();
    const baselineRevision = current.projectionRevision;
    const isCurrentAction = () => mounted.current
      && actionToken.current === token
      && samePayrollScope(currentScope.current, actionScope);
    actionInFlight.current = true;
    setPendingAction(command);
    setActionError(null);
    try {
      await runCommand({
        ...actionScope,
        command,
        projectionRevision: baselineRevision,
        idempotencyKey,
        ...(profile ? { profile } : {}),
      }).unwrap();
      if (!isCurrentAction()) return;
      if (command === "start_provisioning") {
        setAutoOnboardIntent({ key: `${actionScope.employmentId}:auto:${idempotencyKey}`, scope: actionScope, baselineRevision });
        if (profile) setPrerequisitesOpen(false);
      }
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
    const isCurrent = () => mounted.current
      && actionToken.current === token
      && samePayrollScope(currentScope.current, actionScope);
    actionInFlight.current = true;
    setScanning(true);
    setActionError(null);
    try {
      const fresh = await subscription.refetch().unwrap();
      if (!isCurrent()) return;
      if (fresh.agencyIntegration.state === "missing") return;
      if (hasPrerequisites(fresh)) {
        setPrerequisitesOpen(true);
        return;
      }
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

  const ignoreOnboardProgress = useCallback(() => undefined, []);
  const consumeAutoOnboard = useCallback((key: string) => {
    setAutoOnboardIntent((intent) => intent?.key === key ? null : intent);
  }, []);
  const reconcileAfterOnboardClose = useCallback(async () => {
    if (reconciliationInFlight.current) return;
    const reconciliationScope = { ...scope };
    const token = ++reconciliationToken.current;
    const isCurrent = () => mounted.current
      && reconciliationToken.current === token
      && samePayrollScope(currentScope.current, reconciliationScope);
    reconciliationInFlight.current = true;
    setReconciling(true);
    setReconciliationFailed(false);
    setActionError(null);
    try {
      const projection = await reconcileOnboard(reconciliationScope).unwrap();
      if (!isCurrent()) return;
      await dispatch(employeePayrollApi.util.upsertQueryData("getEmployeePayrollSetup", reconciliationScope, projection));
    } catch {
      if (isCurrent()) {
        setReconciliationFailed(true);
        setActionError("Payroll setup could not be refreshed. Refresh payroll status to try again.");
      }
    } finally {
      if (isCurrent()) {
        reconciliationInFlight.current = false;
        setReconciling(false);
      }
    }
  }, [dispatch, reconcileOnboard, scope]);

  if (!active) return null;

  if (!scope.employmentId) {
    return (
      <div className="flex flex-col gap-4">
        <SettingsSectionCard title="Payroll Setup" subtitle="Manage your personal payroll onboarding.">
          <p role="alert" className="text-sm text-[#5d626b]">Payroll setup is not available for this account.</p>
        </SettingsSectionCard>
      </div>
    );
  }

  if (!payroll && (queryState.isUninitialized || queryState.isLoading || queryState.isFetching)) {
    return <div role="status" aria-label="Loading payroll setup" aria-busy="true"><SettingsTabSkeleton variant="form" cardCount={1} /></div>;
  }

  if (!payroll && queryState.isError) {
    return (
      <div className="flex flex-col gap-4">
        <SettingsSectionCard title="Payroll Setup" subtitle="Manage your personal payroll onboarding.">
          <p role="alert" className="text-sm text-[#8b2d2d]">Payroll setup could not be loaded.</p>
          <button type="button" onClick={() => void subscription.refetch()} className="mt-3 min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] hover:bg-[#f0fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2">Try again</button>
        </SettingsSectionCard>
      </div>
    );
  }

  if (!payroll) return null;

  const { setup, capabilities } = payroll;
  const integrationMissing = payroll.agencyIntegration.state === "missing";
  const busy = pendingAction !== null || scanning;
  const progress = pollingStates.has(setup.state);
  const needsAttention = setup.state === "blocked" || setup.state === "needs_attention";
  const onboardingComplete = setup.state === "ready" && setup.onboardingStatus === "completed";
  const onboardingNeedsAction = setup.state === "ready"
    && (setup.onboardingStatus === "blocking" || setup.onboardingStatus === "needs_attention");
  const eligibleAutoStartKey = autoOnboardIntent
    && focused
    && samePayrollScope(autoOnboardIntent.scope, scope)
    && payroll.projectionRevision > autoOnboardIntent.baselineRevision
    && canContinue
    ? autoOnboardIntent.key
    : undefined;
  const overallStatus = integrationMissing
    ? "Waiting on agency"
    : setup.state === "not_started"
      ? "Ready to start"
      : progress
        ? "In progress"
        : needsAttention
          ? "Needs attention"
          : onboardingComplete
            ? "Complete"
            : canContinue
              ? "Action needed"
              : "Preparing";
  const overallTone = overallStatus === "Complete"
    ? "bg-emerald-50 text-emerald-700"
    : overallStatus === "Needs attention" || overallStatus === "Action needed"
      ? "bg-amber-50 text-amber-800"
      : "bg-[#e8fafa] text-[#006f73]";

  return (
    <div className="flex flex-col gap-4">
      <SettingsSectionCard
        title="Payroll Setup"
        subtitle="Follow your setup from your agency connection through payment and tax onboarding."
        className="min-h-[420px]"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-[#5d626b]">
            {onboardingComplete ? "Payroll setup is complete." : "Complete the current step to keep your payroll setup moving."}
          </p>
          <span role="status" aria-live="polite" aria-atomic="true" className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${overallTone}`}>{overallStatus}</span>
        </div>

        {actionError ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-[#8b2d2d]">{actionError}</p> : null}

        <ol ref={payrollJourney} tabIndex={-1} aria-label="Payroll setup progress" className="mt-5 divide-y divide-[#edf0f1] border-y border-[#edf0f1] py-4 focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2">
          <PayrollJourneyStep
            title="Agency payroll connection"
            status={integrationMissing ? "Waiting on agency" : "Complete"}
            state={integrationMissing ? "current" : "complete"}
            icon={<Building2 className="h-4 w-4" />}
          >
            {integrationMissing ? <p role="status">Your agency must complete Payroll Setup before you can start your personal payroll setup.</p> : null}
          </PayrollJourneyStep>

          <PayrollJourneyStep
            title="Employee payroll record"
            status={integrationMissing ? "Upcoming" : setup.state === "not_started" ? "Ready to start" : progress ? "In progress" : needsAttention ? "Needs attention" : "Complete"}
            state={integrationMissing ? "upcoming" : setup.state === "not_started" || progress ? "current" : needsAttention ? "attention" : "complete"}
            icon={<UserRound className="h-4 w-4" />}
          >
            {!integrationMissing && setup.state === "not_started" ? (
              <div>
                <p>We’ll verify your employee record before opening your secure onboarding.</p>
                {capabilities.canStartProvisioning ? (
                  <button
                    type="button"
                    disabled={busy}
                    aria-busy={busy}
                    onClick={() => void startPayroll()}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#006f73] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00595c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
                  >
                    {scanning ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Scanning payroll details…</span> : pendingAction === "start_provisioning" ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Starting payroll setup…</span> : "Start payroll setup"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {!integrationMissing && progress ? <p role="status" aria-label="Payroll setup is in progress" aria-live="polite">Payroll setup is in progress. This page will update automatically.</p> : null}
            {!integrationMissing && needsAttention ? (
              <div>
                {setup.blockers.length ? (
                  <ul aria-label="Payroll setup blockers" className="list-disc space-y-1 pl-5">
                    {setup.blockers.map((blocker) => <li key={blocker}>{employeePayrollBlockerMessage(blocker)}</li>)}
                  </ul>
                ) : null}
                {capabilities.canRetryEmployeeSync ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction("retry_employee_sync")}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#b8dfe0] bg-white px-4 py-2 text-sm font-semibold text-[#006f73] transition-colors hover:bg-[#f0fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
                  >
                    {pendingAction === "retry_employee_sync" ? "Retrying payroll setup..." : "Retry payroll setup"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </PayrollJourneyStep>

          <PayrollJourneyStep
            title="Payment and tax onboarding"
            status={integrationMissing || setup.state !== "ready" ? "Upcoming" : onboardingComplete ? "Complete" : canContinue ? "Action needed" : onboardingNeedsAction ? "Waiting" : "Preparing"}
            state={integrationMissing || setup.state !== "ready" ? "upcoming" : onboardingComplete ? "complete" : onboardingNeedsAction ? "attention" : "current"}
            icon={<WalletCards className="h-4 w-4" />}
            last
          >
            {setup.state === "ready" && !onboardingComplete ? (
              <div className="space-y-3">
                {reconciliationFailed && !reconciling ? (
                  <button
                    type="button"
                    onClick={() => void reconcileAfterOnboardClose()}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#b8dfe0] bg-white px-4 py-2 text-sm font-semibold text-[#006f73] transition-colors hover:bg-[#f0fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 sm:w-auto"
                  >
                    Refresh payroll status
                  </button>
                ) : null}
                {reconciling ? (
                  <div role="status" aria-label="Updating payroll status" aria-live="polite" className="inline-flex min-h-11 items-center gap-2 font-medium text-[#006f73]">
                    <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Updating payroll status…
                  </div>
                ) : canContinue ? (
                  <Suspense fallback={<p role="status" className="min-h-11 py-2 text-sm text-[#5d626b]">Loading payroll onboarding…</p>}>
                    <div className="[&_button]:w-full sm:[&_button]:w-auto">
                      <CheckOnboardModal
                        actionLabel="Continue payroll setup"
                        requestSession={requestOnboardSession}
                        onRefetch={ignoreOnboardProgress}
                        onClosed={reconcileAfterOnboardClose}
                        autoStartKey={eligibleAutoStartKey}
                        onAutoStartConsumed={consumeAutoOnboard}
                        cancelPending={typeof document !== "undefined" && document.visibilityState === "hidden"}
                        loadingDialog={employeeOnboardLoadingDialog}
                      />
                    </div>
                  </Suspense>
                ) : <p>Payroll onboarding is not available yet. Contact your agency if this continues.</p>}
              </div>
            ) : null}
          </PayrollJourneyStep>
        </ol>

        {!integrationMissing && prerequisitesOpen ? (
          <Suspense fallback={<p role="status" aria-busy="true" className="mt-4 text-sm text-[#5d626b]">Loading payroll details…</p>}>
            <EmployeePayrollPrerequisitesModal
              open
              values={payroll.prerequisites.values}
              missingFieldCodes={payroll.prerequisites.missingFieldCodes}
              invalidFieldCodes={payroll.prerequisites.invalidFieldCodes}
              isSubmitting={pendingAction === "start_provisioning"}
              error={actionError}
              onOpenChange={setPrerequisitesOpen}
              onSubmit={async (profile) => { await runAction("start_provisioning", profile); }}
            />
          </Suspense>
        ) : null}
      </SettingsSectionCard>
    </div>
  );
}
