import { useEffect, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { agencyPayrollApi } from "@/features/payroll/api/agencyPayrollEndpoints";
import { useRunManagedEmployeePrimaryWorkplaceCommandMutation } from "@/features/payroll/api/payrollCommands";
import type { ManagedEmployeePrimaryWorkplaceScope } from "@/features/payroll/model/types";

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: unknown }).status === 409;
}

export default function EmployeePrimaryWorkplaceCard({ scope }: { scope: ManagedEmployeePrimaryWorkplaceScope }) {
  const scopeIdentity = JSON.stringify([scope.actorUid, scope.agencyId, scope.employmentId]);
  const scopeTokenRef = useRef({ identity: scopeIdentity, version: 0 });
  if (scopeTokenRef.current.identity !== scopeIdentity) {
    scopeTokenRef.current = { identity: scopeIdentity, version: scopeTokenRef.current.version + 1 };
  }
  const scopeToken = `${scopeTokenRef.current.version}:${scopeTokenRef.current.identity}`;
  const queryArg = scope.employmentId ? scope : skipToken;
  const queryState = agencyPayrollApi.endpoints.getManagedEmployeePrimaryWorkplace.useQueryState(queryArg);
  const subscription = agencyPayrollApi.endpoints.getManagedEmployeePrimaryWorkplace.useQuerySubscription(queryArg);
  const [runCommand] = useRunManagedEmployeePrimaryWorkplaceCommandMutation();
  const [selectedClientAssignmentId, setSelectedClientAssignmentId] = useState<string | null>(null);
  const [ordinaryPrimaryWorkLocation, setOrdinaryPrimaryWorkLocation] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const mounted = useRef(true);
  const actionToken = useRef<{ scopeToken: string } | null>(null);
  const projection = queryState.currentData;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setSelectedClientAssignmentId(null);
    setOrdinaryPrimaryWorkLocation(false);
    setRequestError(null);
  }, [scope.employmentId, projection?.projectionRevision]);

  if (!scope.employmentId) return null;

  if (!projection && (queryState.isLoading || queryState.isFetching)) {
    return <section aria-label="Loading primary work location" aria-busy="true" role="status" className="h-32 animate-pulse rounded-[16px] bg-[#f4f5f6] dark:bg-white/5" />;
  }

  if (!projection && queryState.isError) {
    return <section className="rounded-[16px] border border-[#f0c8c4] bg-[#fdf3f2] p-5 text-sm text-[#b42318] dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10 dark:text-[#f8a1a1]" role="alert">Primary work location could not be loaded. <button type="button" className="font-semibold underline" onClick={() => void subscription.refetch()}>Try again</button></section>;
  }

  if (!projection) return null;

  const { primaryWorkplace } = projection;
  const selectedPrimary = primaryWorkplace.selectedClientAssignmentId
    ? primaryWorkplace.options.find((option) => option.clientAssignmentId === primaryWorkplace.selectedClientAssignmentId)
    : undefined;

  if (selectedPrimary) {
    return <section aria-label="Primary work location" className="rounded-[16px] border border-[#e4e7ea] bg-white p-5 dark:border-white/10 dark:bg-[#1b232b]"><p className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Primary work location: {selectedPrimary.clientLabel}</p></section>;
  }

  if (primaryWorkplace.options.length <= 1) return null;

  const submitting = actionToken.current?.scopeToken === scopeToken;
  const canSubmit = selectedClientAssignmentId !== null && ordinaryPrimaryWorkLocation && !submitting;
  const savePrimaryWorkplace = async () => {
    if (!canSubmit || !selectedClientAssignmentId || actionToken.current?.scopeToken === scopeToken) return;
    const currentAction = { scopeToken };
    actionToken.current = currentAction;
    const isCurrentAction = () => {
      const activeScope = scopeTokenRef.current;
      return mounted.current
        && actionToken.current === currentAction
        && activeScope.identity === scopeIdentity
        && `${activeScope.version}:${activeScope.identity}` === currentAction.scopeToken;
    };
    setRequestError(null);
    try {
      await runCommand({
        ...scope,
        clientAssignmentId: selectedClientAssignmentId,
        projectionRevision: projection.projectionRevision,
        idempotencyKey: crypto.randomUUID(),
      }).unwrap();
    } catch (error) {
      if (!isCurrentAction()) return;
      if (isConflict(error)) {
        setSelectedClientAssignmentId(null);
        setOrdinaryPrimaryWorkLocation(false);
        try {
          await subscription.refetch().unwrap();
        } catch {
          if (isCurrentAction()) {
            setRequestError("The primary work location could not be refreshed. Choose a location again and try again.");
          }
        }
      } else {
        setRequestError("The primary work location could not be saved. Please try again.");
      }
    } finally {
      if (isCurrentAction()) actionToken.current = null;
    }
  };

  return <section aria-labelledby="primary-work-location-heading" className="rounded-[16px] border border-[#e4e7ea] bg-white p-5 dark:border-white/10 dark:bg-[#1b232b]">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#007679] dark:text-[#7fd3d3]">Payroll</p>
    <h2 id="primary-work-location-heading" className="mt-1 text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Primary work location</h2>
    <p className="mt-1 text-sm text-[#4b535b] dark:text-[#9aa4a8]">Select the employee&apos;s ordinary primary work location for payroll setup.</p>
    <fieldset role="radiogroup" aria-label="Choose a primary work location" className="mt-4 space-y-3">
      <legend className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">Choose a primary work location</legend>
      {primaryWorkplace.options.map((option) => <label key={option.clientAssignmentId} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#e4e7ea] px-3 py-3 text-sm text-[#10141a] transition-colors hover:bg-[#f8f9fa] focus-within:ring-2 focus-within:ring-[#007679] dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5">
        <input
          type="radio"
          name={`primary-workplace-${scope.employmentId}`}
          value={option.clientAssignmentId}
          checked={selectedClientAssignmentId === option.clientAssignmentId}
          onChange={() => setSelectedClientAssignmentId(option.clientAssignmentId)}
          disabled={submitting}
          className="h-4 w-4 accent-[#007679]"
        />
        {option.clientLabel}
      </label>)}
    </fieldset>
    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#10141a] dark:text-[#f4f6f7]">
      <input type="checkbox" checked={ordinaryPrimaryWorkLocation} onChange={(event) => setOrdinaryPrimaryWorkLocation(event.target.checked)} disabled={submitting} className="mt-0.5 h-4 w-4 accent-[#007679]" />
      <span>I confirm this is the employee&apos;s ordinary primary work location.</span>
    </label>
    {requestError && <p role="alert" className="mt-3 text-sm text-[#b42318] dark:text-[#f8a1a1]">{requestError}</p>}
    <button type="button" disabled={!canSubmit} onClick={() => void savePrimaryWorkplace()} className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]">{submitting ? "Saving primary work location..." : "Save primary work location"}</button>
  </section>;
}
