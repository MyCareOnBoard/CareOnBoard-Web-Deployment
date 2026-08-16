import { useEffect, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { agencyPayrollApi } from "@/features/payroll/api/agencyPayrollEndpoints";
import { useRunManagedEmployeePrimaryWorkplaceCommandMutation } from "@/features/payroll/api/payrollCommands";
import type { ManagedEmployeePrimaryWorkplaceScope } from "@/features/payroll/model/types";

function isConflict(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: unknown }).status === 409;
}

export default function EmployeePrimaryWorkplaceCard({ scope }: { scope: ManagedEmployeePrimaryWorkplaceScope }) {
  const queryArg = scope.employmentId ? scope : skipToken;
  const queryState = agencyPayrollApi.endpoints.getManagedEmployeePrimaryWorkplace.useQueryState(queryArg);
  const subscription = agencyPayrollApi.endpoints.getManagedEmployeePrimaryWorkplace.useQuerySubscription(queryArg);
  const [runCommand] = useRunManagedEmployeePrimaryWorkplaceCommandMutation();
  const [selectedClientAssignmentId, setSelectedClientAssignmentId] = useState<string | null>(null);
  const [ordinaryPrimaryWorkLocation, setOrdinaryPrimaryWorkLocation] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const projection = queryState.currentData;

  useEffect(() => {
    actionInFlight.current = false;
    setSelectedClientAssignmentId(null);
    setOrdinaryPrimaryWorkLocation(false);
    setRequestError(null);
  }, [scope.employmentId, projection?.projectionRevision]);

  if (!scope.employmentId) return null;

  if (!projection && (queryState.isLoading || queryState.isFetching)) {
    return <section aria-label="Loading primary work location" aria-busy="true" role="status" className="mt-6 h-32 animate-pulse rounded-lg bg-[#edf1f2]" />;
  }

  if (!projection && queryState.isError) {
    return <section className="mt-6 rounded-lg border border-[#e7c3c3] bg-[#fffafa] p-5 text-sm text-[#7a2929]" role="alert">Primary work location could not be loaded. <button type="button" className="font-semibold underline" onClick={() => void subscription.refetch()}>Try again</button></section>;
  }

  if (!projection) return null;

  const { primaryWorkplace } = projection;
  const selectedPrimary = primaryWorkplace.selectedClientAssignmentId
    ? primaryWorkplace.options.find((option) => option.clientAssignmentId === primaryWorkplace.selectedClientAssignmentId)
    : undefined;

  if (selectedPrimary) {
    return <section aria-label="Primary work location" className="mt-6 rounded-lg bg-[#edf1f2] p-5"><p className="text-sm font-semibold text-[#10141a]">Primary work location: {selectedPrimary.clientLabel}</p></section>;
  }

  if (primaryWorkplace.options.length <= 1) return null;

  const submitting = actionInFlight.current;
  const canSubmit = selectedClientAssignmentId !== null && ordinaryPrimaryWorkLocation && !submitting;
  const savePrimaryWorkplace = async () => {
    if (!canSubmit || !selectedClientAssignmentId || actionInFlight.current) return;
    actionInFlight.current = true;
    setRequestError(null);
    try {
      await runCommand({
        ...scope,
        clientAssignmentId: selectedClientAssignmentId,
        projectionRevision: projection.projectionRevision,
        idempotencyKey: crypto.randomUUID(),
      }).unwrap();
    } catch (error) {
      if (isConflict(error)) {
        setSelectedClientAssignmentId(null);
        setOrdinaryPrimaryWorkLocation(false);
        await subscription.refetch();
      } else {
        setRequestError("The primary work location could not be saved. Please try again.");
      }
    } finally {
      actionInFlight.current = false;
    }
  };

  return <section aria-labelledby="primary-work-location-heading" className="mt-6 rounded-lg bg-[#edf1f2] p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006f73]">Payroll</p>
    <h2 id="primary-work-location-heading" className="mt-1 text-lg font-semibold text-[#10141a]">Primary work location</h2>
    <p className="mt-2 text-sm text-[#5d626b]">Select the employee&apos;s ordinary primary work location for payroll setup.</p>
    <fieldset role="radiogroup" aria-label="Choose a primary work location" className="mt-4 space-y-3">
      <legend className="text-sm font-semibold text-[#10141a]">Choose a primary work location</legend>
      {primaryWorkplace.options.map((option) => <label key={option.clientAssignmentId} className="flex cursor-pointer items-center gap-3 rounded-md bg-[#f8fbfb] px-3 py-3 text-sm text-[#10141a] focus-within:ring-2 focus-within:ring-[#006f73]">
        <input
          type="radio"
          name={`primary-workplace-${scope.employmentId}`}
          value={option.clientAssignmentId}
          checked={selectedClientAssignmentId === option.clientAssignmentId}
          onChange={() => setSelectedClientAssignmentId(option.clientAssignmentId)}
          disabled={submitting}
          className="h-4 w-4 accent-[#006f73]"
        />
        {option.clientLabel}
      </label>)}
    </fieldset>
    <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#10141a]">
      <input type="checkbox" checked={ordinaryPrimaryWorkLocation} onChange={(event) => setOrdinaryPrimaryWorkLocation(event.target.checked)} disabled={submitting} className="mt-0.5 h-4 w-4 accent-[#006f73]" />
      <span>I confirm this is the employee&apos;s ordinary primary work location.</span>
    </label>
    {requestError && <p role="alert" className="mt-3 text-sm text-[#8b2d2d]">{requestError}</p>}
    <button type="button" disabled={!canSubmit} onClick={() => void savePrimaryWorkplace()} className="mt-5 rounded-md bg-[#006f73] px-4 py-2 text-sm font-medium text-white hover:bg-[#00595c] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Saving primary work location..." : "Save primary work location"}</button>
  </section>;
}
