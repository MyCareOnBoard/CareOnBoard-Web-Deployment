import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { CompanySetupChecklist } from "@/features/payroll/components/CompanySetupChecklist";
import { SignerSetupCard } from "@/features/payroll/components/SignerSetupCard";
import { AuthorizedSignerSelector, type SignerDesignation } from "@/features/payroll/components/AuthorizedSignerSelector";
import { useBootstrapAgencyPayrollSetupMutation, useGetAgencyPayrollSetupQuery, useLazyGetAgencyPayrollOperationQuery, useLazyGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollSetupQuery } from "@/features/payroll/api/agencyPayrollEndpoints";
import { useProjectionFreshness } from "@/features/payroll/hooks/useProjectionFreshness";
import { newIdempotencyKey, useRunAgencyPayrollCommandMutation } from "@/features/payroll/api/payrollCommands";
import { PayrollOperationProvider, usePayrollOperations } from "@/features/payroll/operations/PayrollOperationProvider";
import type { PayrollOperation, PayrollScope } from "@/features/payroll/model/types";
import AgencyPayrollBootstrapModal, { buildAgencyPayrollBootstrapPayload } from "./AgencyPayrollBootstrapModal";

function setupIncompleteFieldCodes(requestError: unknown): string[] {
  const payload = typeof requestError === "object" && requestError !== null && "data" in requestError ? (requestError as { data?: unknown }).data : undefined;
  if (typeof payload !== "object" || payload === null || !("code" in payload) || (payload as { code?: unknown }).code !== "CHECK_SETUP_INCOMPLETE") return [];
  if (!("missingFieldCodes" in payload) || !Array.isArray((payload as { missingFieldCodes?: unknown }).missingFieldCodes)) return [];
  return (payload as { missingFieldCodes: unknown[] }).missingFieldCodes.filter((code): code is string => typeof code === "string");
}

function AgencyPayrollSetupContent({ scope }: { scope: PayrollScope }) {
  const { data, isLoading, isFetching, error, refetch } = useGetAgencyPayrollSetupQuery(scope, { skip: !scope.actorUid || !scope.agencyId });
  const [getSetup] = useLazyGetAgencyPayrollSetupQuery();
  const [bootstrapAgencyPayrollSetup] = useBootstrapAgencyPayrollSetupMutation();
  const [runCommand] = useRunAgencyPayrollCommandMutation();
  const [getOperation] = useLazyGetAgencyPayrollOperationQuery();
  const [getOverview] = useLazyGetAgencyPayrollOverviewQuery();
  const { watch } = usePayrollOperations();
  const cancelOperation = useRef<(() => void) | null>(null);
  const freshness = useProjectionFreshness(data, refetch);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [bootstrapProjection, setBootstrapProjection] = useState<typeof data>(undefined);
  const [submissionFieldCodes, setSubmissionFieldCodes] = useState<string[]>([]);
  const [configuredSignerSelection, setConfiguredSignerSelection] = useState<SignerDesignation | null>(null);
  const [signerSelectorResetKey, setSignerSelectorResetKey] = useState(0);
  const scopeKey = useMemo(() => JSON.stringify([scope.actorUid, scope.agencyId]), [scope.actorUid, scope.agencyId]);
  const activeScopeKey = useRef(scopeKey);
  const requestGeneration = useRef(0);
  const [awaitingConfigured, setAwaitingConfigured] = useState(false);
  useEffect(() => { activeScopeKey.current = scopeKey; requestGeneration.current += 1; setBootstrapProjection(undefined); setSubmissionFieldCodes([]); setConfiguredSignerSelection(null); setSignerSelectorResetKey(0); setCommandError(null); setIsScanning(false); setIsCreating(false); setAwaitingConfigured(false); }, [scopeKey]);
  useEffect(() => { if (data?.integration.state === "configured") { setIsCreating(false); setAwaitingConfigured(false); } }, [data?.integration.state]);
  useEffect(() => () => cancelOperation.current?.(), [scope.actorUid, scope.agencyId]);
  if (isLoading) {
    if (isCreating || awaitingConfigured) return <div role="status" aria-busy="true" className="flex items-center gap-2 rounded-md border border-[#e0e5e5] bg-white p-6 text-sm font-semibold text-[#006f73]"><Loader2 data-testid="agency-payroll-create-spinner" aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />Creating payroll setup…</div>;
    return <div role="status" aria-busy="true" aria-label="Loading payroll setup" className="h-32 animate-pulse rounded-md bg-[#f3f6f6]"><span className="sr-only">Loading payroll setup…</span></div>;
  }
  if (error || !data) return <section role="alert" className="rounded-md border border-[#e7c3c3] bg-[#fffafa] p-5 text-sm text-[#7a2929]">Payroll setup is unavailable. <button type="button" onClick={() => void refetch()} className="font-semibold underline">Try again</button></section>;
  if (data.integration.state === "not_configured") {
    const scanAgency = async () => {
      if (isScanning || isCreating || awaitingConfigured) return;
      const generation = ++requestGeneration.current;
      const current = () => activeScopeKey.current === scopeKey && requestGeneration.current === generation;
      let phase: "scan" | "create" = "scan";
      let freshProjection: typeof bootstrapProjection = undefined;
      setIsScanning(true);
      setCommandError(null);
      try {
        const fresh = await getSetup(scope, false).unwrap();
        if (!current()) return;
        freshProjection = fresh;
        if (fresh.integration.state === "not_configured" && fresh.preflight.missingFieldCodes.length) setBootstrapProjection(fresh);
        else if (fresh.integration.state === "not_configured") {
          phase = "create";
          setIsScanning(false);
          setIsCreating(true);
          await bootstrapAgencyPayrollSetup({ ...scope, expectedProjectionRevision: fresh.projectionRevision, checkPayrollProfile: buildAgencyPayrollBootstrapPayload(fresh.preflight.values) }).unwrap();
          if (!current()) return;
          setAwaitingConfigured(true);
        }
      } catch (requestError: unknown) {
        if (current()) {
          const missingFieldCodes = phase === "create" ? setupIncompleteFieldCodes(requestError) : [];
          if (missingFieldCodes.length && freshProjection) {
            setBootstrapProjection(freshProjection);
            setSubmissionFieldCodes(missingFieldCodes);
          }
          setCommandError(missingFieldCodes.length
            ? "Complete the highlighted payroll details."
            : phase === "create" ? "Payroll setup could not be created. Review the details and try again." : "We could not scan the agency details. Try again.");
          setIsCreating(false);
          setAwaitingConfigured(false);
        }
      } finally {
        if (current()) setIsScanning(false);
      }
    };
    const showInlineCreating = (isCreating || awaitingConfigured) && !bootstrapProjection;
    return <section className="max-w-3xl rounded-lg border border-[#e0e5e5] bg-white p-6" aria-labelledby="payroll-bootstrap-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#006f73]">Payroll</p>
      <h2 id="payroll-bootstrap-heading" className="mt-1 text-xl font-semibold text-[#10141a]">Set up payroll</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#5d626b]">Create your agency payroll setup from the details already on file. We will ask only for required information that is missing.</p>
      {commandError && <p role="alert" className="mt-4 text-sm text-[#8b2d2d]">{commandError}</p>}
      {data.capabilities.canCreateIntegration && <button type="button" disabled={isScanning || isCreating || awaitingConfigured} aria-busy={isScanning || showInlineCreating} onClick={() => void scanAgency()} className="mt-5 inline-flex min-h-11 min-w-[14rem] items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#005b5e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006f73] disabled:opacity-60">{showInlineCreating ? <span role="status" className="inline-flex items-center gap-2"><Loader2 data-testid="agency-payroll-create-spinner" aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />Creating payroll setup…</span> : isScanning ? <span role="status" className="inline-flex items-center gap-2"><Loader2 data-testid="agency-payroll-scan-spinner" aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />Scanning agency details…</span> : "Create payroll setup"}</button>}
      {bootstrapProjection && <AgencyPayrollBootstrapModal
        open
        scope={scope}
        values={bootstrapProjection.preflight.values}
        missingFieldCodes={bootstrapProjection.preflight.missingFieldCodes}
        isSubmitting={isCreating}
        submissionError={commandError}
        submissionFieldCodes={submissionFieldCodes}
        onOpenChange={(open) => { if (!open && !isCreating) { setBootstrapProjection(undefined); setSubmissionFieldCodes([]); setCommandError(null); } }}
        onSubmit={async (checkPayrollProfile, signerSelection) => {
          const generation = ++requestGeneration.current;
          const current = () => activeScopeKey.current === scopeKey && requestGeneration.current === generation;
          let succeeded = false;
          setIsCreating(true);
          setCommandError(null);
          setSubmissionFieldCodes([]);
          try {
            const created = await bootstrapAgencyPayrollSetup({ ...scope, expectedProjectionRevision: bootstrapProjection.projectionRevision, checkPayrollProfile }).unwrap();
            if (!current()) return;
            setBootstrapProjection(undefined);
            if (signerSelection) {
              try {
                await runCommand({ ...scope, command: "designate_signer", projectionRevision: created.projectionRevision, designatedSignerUserUid: signerSelection.candidate.userUid, designatedSignerIdentityVersion: signerSelection.candidate.identityVersion, authorityAttested: true, idempotencyKey: signerSelection.idempotencyKey }).unwrap();
              } catch (requestError: unknown) {
                if (current()) {
                  if (typeof requestError === "object" && requestError !== null && "status" in requestError && (requestError as { status?: number }).status === 409) {
                    setConfiguredSignerSelection(null);
                    setSignerSelectorResetKey((currentKey) => currentKey + 1);
                    setCommandError("Payroll setup succeeded, but signer details changed. Reselect the signer and confirm authority before trying again.");
                    await refetch();
                    void getOverview(scope);
                  } else {
                    setConfiguredSignerSelection(signerSelection);
                    setCommandError("Payroll setup succeeded, but signer designation failed. An owner can retry signer designation from Payroll Setup.");
                  }
                }
              }
            }
            setAwaitingConfigured(true);
            succeeded = true;
          } catch (requestError: unknown) {
            if (!current()) return;
            const missingFieldCodes = setupIncompleteFieldCodes(requestError);
            setSubmissionFieldCodes(missingFieldCodes);
            setCommandError(missingFieldCodes.length ? "Complete the highlighted payroll details." : "Payroll setup could not be created. Review the details and try again.");
            throw requestError;
          } finally {
            if (current() && !succeeded) setIsCreating(false);
          }
        }}
      />}
    </section>;
  }
  const watchOperation = (operation: PayrollOperation) => { cancelOperation.current?.(); cancelOperation.current = watch(scope, operation.operationId, async () => getOperation({ ...scope, operationId: operation.operationId }).unwrap(), () => { void refetch(); void getOverview(scope); }); };
  const signerAction = async (command: "designate_signer" | "clear_signer" | "retry_company_sync" | "refresh_company_reconciliation", authorityAttested?: true, selectedSigner = data.setup.signerCandidate, suppliedIdempotencyKey?: ReturnType<typeof newIdempotencyKey>) => {
    if (command === "designate_signer" && authorityAttested !== true) {
      setCommandError("Confirm authority for the verified account before designating a signer.");
      return false;
    }
    const signerCandidate = selectedSigner;
    if (command === "designate_signer" && (!signerCandidate || signerCandidate.designated)) {
      setCommandError("A verified agency owner account is required before a payroll signer can be designated.");
      return false;
    }
    if (!await freshness.requireCurrentProjection()) return false;
    setCommandError(null);
    const idempotencyKey = suppliedIdempotencyKey ?? newIdempotencyKey();
    try {
      const operation = command === "designate_signer"
        ? await runCommand({ ...scope, command, projectionRevision: data.projectionRevision, designatedSignerUserUid: signerCandidate!.userUid, designatedSignerIdentityVersion: signerCandidate!.identityVersion, authorityAttested: true, idempotencyKey }).unwrap()
        : await runCommand({ ...scope, command, projectionRevision: data.projectionRevision, idempotencyKey }).unwrap();
      watchOperation(operation);
      return true;
    } catch (requestError: unknown) {
      if (typeof requestError === "object" && requestError !== null && "status" in requestError && (requestError as { status?: number }).status === 409) {
        setConfiguredSignerSelection(null);
        setSignerSelectorResetKey((current) => current + 1);
        setCommandError("Payroll setup changed. Reselect the signer and confirm authority before trying again.");
        await refetch();
        void getOverview(scope);
        return false;
      }
      setCommandError("The payroll command could not be completed. Review the current setup and try again.");
      return false;
    }
  };
  return <div className="max-w-3xl divide-y divide-[#e5e7eb] rounded-lg border border-[#e0e5e5] bg-white px-6">{isFetching && <p role="status" className="flex items-center gap-2 py-3 text-sm text-[#5d626b]"><Loader2 data-testid="agency-payroll-refresh-spinner" aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />Refreshing payroll setup…</p>}{commandError && <p role="alert" className="py-3 text-sm text-[#8b2d2d]">{commandError}</p>}<CompanySetupChecklist projection={data} /><SignerSetupCard projection={data} onAction={signerAction} hideDesignation />{data.capabilities.canDesignateSigner && !data.setup.designatedSignerPresent && <section className="py-6"><AuthorizedSignerSelector scope={scope} initialSelection={configuredSignerSelection} resetKey={signerSelectorResetKey} onSelectionChange={setConfiguredSignerSelection} /><button type="button" disabled={!configuredSignerSelection} onClick={() => configuredSignerSelection && void signerAction("designate_signer", true, configuredSignerSelection.candidate, configuredSignerSelection.idempotencyKey)} className="mt-4 text-sm font-semibold text-[#006f73] underline disabled:opacity-50">Designate selected signer</button></section>}{data.capabilities.canManage && <div className="py-5 flex gap-3"><button type="button" onClick={() => void signerAction("retry_company_sync")} className="text-sm font-semibold text-[#006f73] underline">Retry company sync</button><button type="button" onClick={() => void signerAction("refresh_company_reconciliation")} className="text-sm font-semibold text-[#006f73] underline">Refresh reconciliation</button></div>}</div>;
}

export default function AgencyPayrollSetupTab({ scope }: { scope: PayrollScope }) {
  return <PayrollOperationProvider><AgencyPayrollSetupContent key={JSON.stringify([scope.actorUid, scope.agencyId])} scope={scope} /></PayrollOperationProvider>;
}
