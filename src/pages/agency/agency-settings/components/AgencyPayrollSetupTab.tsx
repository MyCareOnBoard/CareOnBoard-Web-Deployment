import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, Building2, ClipboardCheck, Loader2, UserRound } from "lucide-react";
import SettingsSectionCard from "@/pages/shared/settings/SettingsSectionCard";
import { CompanySetupChecklist } from "@/features/payroll/components/CompanySetupChecklist";
import { SignerSetupCard } from "@/features/payroll/components/SignerSetupCard";
import { PayrollJourneyStep } from "@/features/payroll/components/PayrollJourneyStep";
import { AuthorizedSignerSelector, type SignerDesignation } from "@/features/payroll/components/AuthorizedSignerSelector";
import { useBootstrapAgencyPayrollSetupMutation, useCreateCompanyOnboardSessionMutation, useGetAgencyPayrollSetupQuery, useLazyGetAgencyPayrollOperationQuery, useLazyGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollSetupQuery } from "@/features/payroll/api/agencyPayrollEndpoints";
import { newIdempotencyKey, useRunAgencyPayrollCommandMutation } from "@/features/payroll/api/payrollCommands";
import { PayrollOperationProvider, usePayrollOperations } from "@/features/payroll/operations/PayrollOperationProvider";
import type { AgencyPayrollSetupProjection, PayrollOperation, PayrollScope } from "@/features/payroll/model/types";
import type { CheckOnboardLoadingDialogConfig } from "@/features/payroll/onboard/CheckOnboardModal";
import AgencyPayrollBootstrapModal, { buildAgencyPayrollBootstrapPayload } from "./AgencyPayrollBootstrapModal";
import { deriveAgencyPayrollJourney, type AgencyPayrollJourneyStep } from "./agencyPayrollJourney";
import SettingsTabSkeleton from "./SettingsTabSkeleton";

type AgencyPayrollCommand = "designate_signer" | "clear_signer" | "retry_company_sync" | "refresh_company_reconciliation" | "submit_company_implementation";
type ActivationToken = { sequence: number; scopeKey: string; phase: "awaiting_projection" | "awaiting_acceptance" | "consumed" };
type CommandFlight =
  | { scopeKey: string; phase: "awaiting_acceptance"; operationId: null }
  | { scopeKey: string; phase: "accepted" | "terminal_hydration_pending"; operationId: string };
type BootstrapContinuation = { scopeKey: string; signerUserUid: string; reconciliationAttempted: boolean };
type AutoOnboardIntent = { key: string; scopeKey: string; signerUserUid: string; companyOnboardRevision: number };
type AfterTerminal = (projection: AgencyPayrollSetupProjection | null) => void | Promise<void>;

export type AgencyPayrollSetupTabProps = { scope: PayrollScope; active?: boolean };

const terminalOperationStates = new Set(["succeeded", "failed", "dead"]);
const commandStatusLabels: Record<AgencyPayrollCommand, string> = {
  designate_signer: "Designating payroll signer",
  clear_signer: "Clearing payroll signer",
  retry_company_sync: "Retrying company sync",
  refresh_company_reconciliation: "Refreshing payroll status",
  submit_company_implementation: "Submitting company for Check review",
};
const journeyIcons: Record<AgencyPayrollJourneyStep["id"], ReactNode> = {
  "company-connection": <Building2 className="h-4 w-4" />,
  "authorized-signer": <UserRound className="h-4 w-4" />,
  "company-onboarding": <ClipboardCheck className="h-4 w-4" />,
  "check-review": <BadgeCheck className="h-4 w-4" />,
};
const agencyOnboardLoadingDialog = {
  preparing: { title: "Preparing payroll onboarding", description: "Creating a fresh, secure link to Check. This will open automatically." },
  opening: { title: "Opening Check onboarding", description: "Your secure link is ready. Connecting you to Check now." },
} satisfies CheckOnboardLoadingDialogConfig;
const ignoreOnboardProgress = () => undefined;

const CheckOnboardModal = lazy(async () => {
  const module = await import("@/features/payroll/onboard/CheckOnboardModal");
  return { default: module.CheckOnboardModal };
});

function setupIncompleteFieldCodes(requestError: unknown): string[] {
  const payload = typeof requestError === "object" && requestError !== null && "data" in requestError ? (requestError as { data?: unknown }).data : undefined;
  if (typeof payload !== "object" || payload === null || !("code" in payload) || (payload as { code?: unknown }).code !== "CHECK_SETUP_INCOMPLETE") return [];
  if (!("missingFieldCodes" in payload) || !Array.isArray((payload as { missingFieldCodes?: unknown }).missingFieldCodes)) return [];
  return (payload as { missingFieldCodes: unknown[] }).missingFieldCodes.filter((code): code is string => typeof code === "string");
}

const isProjectionStale = (error: unknown) =>
  typeof error === "object"
  && error !== null
  && "data" in error
  && typeof error.data === "object"
  && error.data !== null
  && "code" in error.data
  && error.data.code === "PROJECTION_STALE";

function unwrapQueryResult<T>(result: unknown): Promise<T> {
  if (result && typeof result === "object" && "unwrap" in result && typeof (result as { unwrap?: unknown }).unwrap === "function") {
    return (result as { unwrap: () => Promise<T> }).unwrap();
  }
  return Promise.resolve(result as T);
}

function AgencyPayrollSetupContent({ scope, active }: { scope: PayrollScope; active: boolean }) {
  const { data, isLoading, isFetching, error, refetch } = useGetAgencyPayrollSetupQuery(scope, { skip: !scope.actorUid || !scope.agencyId });
  const [getSetup] = useLazyGetAgencyPayrollSetupQuery();
  const [bootstrapAgencyPayrollSetup] = useBootstrapAgencyPayrollSetupMutation();
  const [createCompanyOnboardSession] = useCreateCompanyOnboardSessionMutation();
  const [runCommand] = useRunAgencyPayrollCommandMutation();
  const [getOperation] = useLazyGetAgencyPayrollOperationQuery();
  const [getOverview] = useLazyGetAgencyPayrollOverviewQuery();
  const { watch } = usePayrollOperations();
  const scopeKey = useMemo(() => JSON.stringify([scope.actorUid, scope.agencyId]), [scope.actorUid, scope.agencyId]);

  const [commandError, setCommandError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [awaitingConfigured, setAwaitingConfigured] = useState(false);
  const [bootstrapProjection, setBootstrapProjection] = useState<AgencyPayrollSetupProjection | undefined>();
  const [submissionFieldCodes, setSubmissionFieldCodes] = useState<string[]>([]);
  const [configuredSignerSelection, setConfiguredSignerSelection] = useState<SignerDesignation | null>(null);
  const [configuredSignerIdempotencyKey, setConfiguredSignerIdempotencyKey] = useState<ReturnType<typeof newIdempotencyKey> | "">("");
  const [signerSelectorResetKey, setSignerSelectorResetKey] = useState(0);
  const [activePayrollCommand, setActivePayrollCommand] = useState<AgencyPayrollCommand | null>(null);
  const [statusRefreshRequired, setStatusRefreshRequired] = useState(false);
  const [isRetryingStatusRefresh, setIsRetryingStatusRefresh] = useState(false);
  const [autoIntent, setAutoIntent] = useState<AutoOnboardIntent | null>(null);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState === "visible");

  const activationRef = useRef<ActivationToken | null>(null);
  const commandFlightRef = useRef<CommandFlight | null>(null);
  const bootstrapContinuationRef = useRef<BootstrapContinuation | null>(null);
  const latestProjectionRef = useRef<AgencyPayrollSetupProjection | null>(null);
  const activationSequenceRef = useRef(0);
  const activePayrollCommandRef = useRef<AgencyPayrollCommand | null>(null);
  const cancelOperation = useRef<(() => void) | null>(null);
  const terminalContinuationRef = useRef<AfterTerminal | null>(null);
  const configuredSignerIntent = useRef<string | null>(null);
  const autoIntentSequenceRef = useRef(0);
  const launchGeneration = useRef(0);
  const requestGeneration = useRef(0);
  const mounted = useRef(false);
  const activeRef = useRef(active);
  const activeScopeKey = useRef(scopeKey);
  const documentVisibleRef = useRef(documentVisible);
  const latestCompanyOnboardRevisionRef = useRef<number | null>(null);
  activeRef.current = active;

  const currentScopeIsMounted = () => mounted.current && activeScopeKey.current === scopeKey;
  const currentScopeIsActive = () => mounted.current && activeRef.current && activeScopeKey.current === scopeKey;

  const clearCommandFlight = () => {
    if (commandFlightRef.current?.scopeKey !== scopeKey) return;
    commandFlightRef.current = null;
    terminalContinuationRef.current = null;
    activePayrollCommandRef.current = null;
    cancelOperation.current = null;
    setActivePayrollCommand(null);
  };

  const armAutoOnboard = (projection: AgencyPayrollSetupProjection, signerUserUid: string) => {
    if (!currentScopeIsActive() || signerUserUid !== scope.actorUid || projection.setup.designatedSigner?.userUid !== signerUserUid || !projection.capabilities.createCompanyOnboardSession) return false;
    const revision = projection.setup.companyOnboardRevision;
    if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision <= 0) return false;
    setAutoIntent({ key: `${scopeKey}:${revision}:${++autoIntentSequenceRef.current}`, scopeKey, signerUserUid, companyOnboardRevision: revision });
    return true;
  };

  const hydrateTerminal = async (): Promise<AgencyPayrollSetupProjection | null> => {
    const [setup] = await Promise.all([
      unwrapQueryResult<AgencyPayrollSetupProjection>(refetch()),
      unwrapQueryResult<unknown>(getOverview(scope)),
    ]);
    if (!currentScopeIsActive()) return null;
    const projection = setup && typeof setup === "object" && "projectionRevision" in setup ? setup : latestProjectionRef.current;
    if (projection) latestProjectionRef.current = projection;
    setStatusRefreshRequired(false);
    setIsRetryingStatusRefresh(false);
    return projection;
  };

  const finishTerminal = async () => {
    const continuation = terminalContinuationRef.current;
    try {
      const projection = await hydrateTerminal();
      if (!currentScopeIsActive()) return;
      clearCommandFlight();
      await continuation?.(projection);
    } catch {
      if (!currentScopeIsActive()) return;
      setStatusRefreshRequired(true);
      setIsRetryingStatusRefresh(false);
      setCommandError("Payroll status refresh is required before another command can be started.");
    }
  };

  const watchAcceptedOperation = (operation: PayrollOperation, afterTerminal?: AfterTerminal) => {
    if (!currentScopeIsActive()) return;
    const currentFlight = commandFlightRef.current;
    if (currentFlight?.phase === "accepted" && currentFlight.operationId === operation.operationId && cancelOperation.current) return;
    commandFlightRef.current = { scopeKey, phase: "accepted", operationId: operation.operationId };
    terminalContinuationRef.current = afterTerminal ?? null;
    cancelOperation.current?.();
    cancelOperation.current = watch(
      scope,
      operation.operationId,
      async () => getOperation({ ...scope, operationId: operation.operationId }).unwrap(),
      () => { if (currentScopeIsActive() && commandFlightRef.current?.operationId === operation.operationId) void finishTerminal(); },
    );
  };

  const resumeActivationAfterFailure = () => {
    const token = activationRef.current;
    if (!token || token.scopeKey !== scopeKey || token.phase !== "awaiting_acceptance" || !currentScopeIsActive()) return;
    token.phase = "awaiting_projection";
    queueMicrotask(() => runActivationDecision());
  };

  const runCompanyCommand = async (command: AgencyPayrollCommand, options: {
    projection?: AgencyPayrollSetupProjection;
    selectedSigner?: SignerDesignation["candidate"] | null;
    idempotencyKey?: ReturnType<typeof newIdempotencyKey>;
    afterTerminal?: AfterTerminal;
    suppressError?: boolean;
    preserveFlightOnStale?: boolean;
    continueFlight?: boolean;
  } = {}): Promise<{ accepted: boolean; error?: unknown; terminalProjection?: AgencyPayrollSetupProjection | null }> => {
    const currentFlight = commandFlightRef.current;
    if (!currentScopeIsActive() || (!options.continueFlight && currentFlight?.scopeKey === scopeKey)) return { accepted: false };
    if (options.continueFlight && (currentFlight?.scopeKey !== scopeKey || currentFlight.phase !== "awaiting_acceptance")) return { accepted: false };
    const projection = options.projection ?? latestProjectionRef.current;
    if (!projection) return { accepted: false };
    if (!options.continueFlight) commandFlightRef.current = { scopeKey, phase: "awaiting_acceptance", operationId: null };
    terminalContinuationRef.current = options.afterTerminal ?? null;
    activePayrollCommandRef.current = command;
    setActivePayrollCommand(command);
    setCommandError(null);
    const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey();
    try {
      const operation = command === "designate_signer"
        ? await runCommand({ ...scope, command, projectionRevision: projection.projectionRevision, designatedSignerUserUid: options.selectedSigner!.userUid, designatedSignerIdentityVersion: options.selectedSigner!.identityVersion, authorityAttested: true, idempotencyKey }).unwrap()
        : await runCommand({ ...scope, command, projectionRevision: projection.projectionRevision, idempotencyKey }).unwrap();
      if (!currentScopeIsMounted() || commandFlightRef.current?.phase !== "awaiting_acceptance") return { accepted: false };
      if (!activeRef.current) {
        commandFlightRef.current = { scopeKey, phase: terminalOperationStates.has(operation.state) ? "terminal_hydration_pending" : "accepted", operationId: operation.operationId };
        return { accepted: true };
      }
      const token = activationRef.current;
      if (token?.scopeKey === scopeKey && token.phase === "awaiting_acceptance") token.phase = "consumed";
      if (terminalOperationStates.has(operation.state)) {
        commandFlightRef.current = { scopeKey, phase: "terminal_hydration_pending", operationId: operation.operationId };
        const continuation = terminalContinuationRef.current;
        try {
          const terminalProjection = await hydrateTerminal();
          if (!currentScopeIsActive()) return { accepted: false };
          clearCommandFlight();
          await continuation?.(terminalProjection);
          return { accepted: true, terminalProjection };
        } catch (terminalRefreshError: unknown) {
          if (currentScopeIsActive()) {
            setStatusRefreshRequired(true);
            setIsRetryingStatusRefresh(false);
            setCommandError("Payroll status refresh is required before another command can be started.");
          }
          return { accepted: true, error: terminalRefreshError };
        }
      }
      watchAcceptedOperation(operation, options.afterTerminal);
      return { accepted: true };
    } catch (requestError: unknown) {
      if (!currentScopeIsMounted()) return { accepted: false, error: requestError };
      if (options.preserveFlightOnStale && isProjectionStale(requestError) && activeRef.current) return { accepted: false, error: requestError };
      clearCommandFlight();
      if (!activeRef.current) return { accepted: false, error: requestError };
      resumeActivationAfterFailure();
      if (!options.suppressError) setCommandError(command === "submit_company_implementation" ? "Your company could not be submitted for review. Review the current setup and try again." : "The payroll command could not be completed. Review the current setup and try again.");
      return { accepted: false, error: requestError };
    }
  };

  async function reconcileCompany(afterTerminal?: AfterTerminal) {
    const initial = latestProjectionRef.current;
    if (!currentScopeIsActive() || commandFlightRef.current?.scopeKey === scopeKey || initial?.integration.state !== "configured" || !initial.capabilities.canRefreshCompanyReconciliation) return false;
    const first = await runCompanyCommand("refresh_company_reconciliation", { projection: initial, afterTerminal, suppressError: true, preserveFlightOnStale: true });
    if (first.accepted) return true;
    if (!isProjectionStale(first.error) || !currentScopeIsActive()) {
      if (first.error) setCommandError("The payroll command could not be completed. Review the current setup and try again.");
      return false;
    }
    try {
      const fresh = await getSetup(scope, false).unwrap();
      if (!currentScopeIsActive()) {
        if (currentScopeIsMounted()) clearCommandFlight();
        return false;
      }
      latestProjectionRef.current = fresh;
      if (fresh.integration.state !== "configured" || !fresh.capabilities.canRefreshCompanyReconciliation) {
        clearCommandFlight();
        return false;
      }
      const retry = await runCompanyCommand("refresh_company_reconciliation", { projection: fresh, afterTerminal, suppressError: true, idempotencyKey: newIdempotencyKey(), continueFlight: true });
      if (!retry.accepted && retry.error) setCommandError("The payroll command could not be completed. Review the current setup and try again.");
      return retry.accepted;
    } catch {
      if (currentScopeIsActive()) {
        clearCommandFlight();
        setCommandError("Payroll setup could not be refreshed. Try again.");
      } else if (currentScopeIsMounted()) clearCommandFlight();
      return false;
    }
  }

  const finishBootstrapContinuation = async (projection: AgencyPayrollSetupProjection | null) => {
    const continuation = bootstrapContinuationRef.current;
    if (!continuation || continuation.scopeKey !== scopeKey || !projection || !currentScopeIsActive()) return;
    if (armAutoOnboard(projection, continuation.signerUserUid)) {
      bootstrapContinuationRef.current = null;
      return;
    }
    if (projection.capabilities.canRefreshCompanyReconciliation && !continuation.reconciliationAttempted) {
      continuation.reconciliationAttempted = true;
      const signerUserUid = continuation.signerUserUid;
      await reconcileCompany(async (terminalProjection) => {
        bootstrapContinuationRef.current = null;
        if (terminalProjection) armAutoOnboard(terminalProjection, signerUserUid);
      });
      return;
    }
    bootstrapContinuationRef.current = null;
  };

  function runActivationDecision() {
    const token = activationRef.current;
    const projection = latestProjectionRef.current;
    if (!token || token.scopeKey !== scopeKey || token.phase === "consumed" || !projection || !currentScopeIsActive()) return;
    const flight = commandFlightRef.current;
    if (flight?.scopeKey === scopeKey && flight.phase === "terminal_hydration_pending") {
      token.phase = "consumed";
      void finishTerminal();
      return;
    }
    if (flight?.scopeKey === scopeKey && flight.phase === "accepted") {
      token.phase = "consumed";
      if (!statusRefreshRequired) {
        const continuation = terminalContinuationRef.current;
        watchAcceptedOperation({ operationId: flight.operationId, state: "accepted", resourceType: "company", pollAfterMs: null }, continuation ?? undefined);
      }
      return;
    }
    const activeOperation = projection.activeOperation;
    if (activeOperation && !terminalOperationStates.has(activeOperation.state)) {
      token.phase = "consumed";
      activePayrollCommandRef.current = "refresh_company_reconciliation";
      setActivePayrollCommand("refresh_company_reconciliation");
      watchAcceptedOperation(activeOperation);
      return;
    }
    if (flight?.scopeKey === scopeKey && flight.phase === "awaiting_acceptance") {
      token.phase = "awaiting_acceptance";
      return;
    }
    token.phase = "consumed";
    if (!flight && projection.integration.state === "configured" && projection.capabilities.canRefreshCompanyReconciliation) void reconcileCompany();
  }

  useEffect(() => {
    mounted.current = true;
    activeScopeKey.current = scopeKey;
    return () => {
      mounted.current = false;
      activeRef.current = false;
      activationRef.current = null;
      bootstrapContinuationRef.current = null;
      terminalContinuationRef.current = null;
      launchGeneration.current += 1;
      requestGeneration.current += 1;
      cancelOperation.current?.();
      cancelOperation.current = null;
      commandFlightRef.current = null;
      activePayrollCommandRef.current = null;
    };
  }, [scopeKey]);

  useEffect(() => {
    if (!active) {
      activationRef.current = null;
      bootstrapContinuationRef.current = null;
      terminalContinuationRef.current = null;
      launchGeneration.current += 1;
      setAutoIntent(null);
      cancelOperation.current?.();
      cancelOperation.current = null;
      if (!commandFlightRef.current) {
        activePayrollCommandRef.current = null;
        setActivePayrollCommand(null);
      }
      return;
    }
    activationRef.current = { sequence: ++activationSequenceRef.current, scopeKey, phase: "awaiting_projection" };
    queueMicrotask(() => runActivationDecision());
  }, [active, scopeKey]);

  useEffect(() => {
    if (!data) return;
    latestProjectionRef.current = data;
    runActivationDecision();
    setAutoIntent((current) => {
      if (!current) return current;
      if (current.scopeKey !== scopeKey || current.signerUserUid !== scope.actorUid) return null;
      if (data.capabilities.createCompanyOnboardSession) return current;
      return null;
    });
  }, [data, scope.actorUid, scopeKey]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      if (documentVisibleRef.current && !visible) launchGeneration.current += 1;
      documentVisibleRef.current = visible;
      setDocumentVisible(visible);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (data?.integration.state === "configured") {
      setIsCreating(false);
      setAwaitingConfigured(false);
    }
  }, [data?.integration.state]);

  const safeCompanyOnboardRevision = typeof data?.setup.companyOnboardRevision === "number" && Number.isSafeInteger(data.setup.companyOnboardRevision) && data.setup.companyOnboardRevision > 0 ? data.setup.companyOnboardRevision : null;
  latestCompanyOnboardRevisionRef.current = safeCompanyOnboardRevision;
  const canRequestSession = Boolean(data?.capabilities.createCompanyOnboardSession && safeCompanyOnboardRevision !== null);
  const mayAutoStart = canRequestSession && active && documentVisible && autoIntent?.scopeKey === scopeKey && autoIntent.signerUserUid === scope.actorUid && autoIntent.companyOnboardRevision === safeCompanyOnboardRevision;

  const requestCompanyOnboardSession = useCallback(async () => {
    const requestedRevision = latestCompanyOnboardRevisionRef.current;
    const generation = launchGeneration.current;
    const current = () => mounted.current && activeRef.current && documentVisibleRef.current && activeScopeKey.current === scopeKey && launchGeneration.current === generation && latestCompanyOnboardRevisionRef.current === requestedRevision;
    if (requestedRevision === null || !current()) throw new Error("Payroll onboarding request is no longer current.");
    try {
      const session = await createCompanyOnboardSession({ ...scope, expectedCompanyOnboardRevision: requestedRevision }).unwrap();
      if (!current()) throw new Error("Payroll onboarding request is no longer current.");
      return { link: session.url, expiresAt: session.expiresAt };
    } catch (requestError: unknown) {
      if (current() && typeof requestError === "object" && requestError !== null && "status" in requestError && (requestError as { status?: number }).status === 409) {
        await unwrapQueryResult(refetch());
        if (current()) void getOverview(scope);
      }
      throw requestError;
    }
  }, [createCompanyOnboardSession, getOverview, refetch, scope, scopeKey]);

  const consumeAutoIntent = useCallback((key: string) => setAutoIntent((current) => current?.key === key ? null : current), []);
  const onConfiguredSignerSelectionChange = useCallback((selection: SignerDesignation | null) => {
    const intent = selection ? `${selection.candidate.userUid}:${selection.candidate.identityVersion}` : null;
    if (intent !== configuredSignerIntent.current) {
      configuredSignerIntent.current = intent;
      setConfiguredSignerIdempotencyKey(intent ? newIdempotencyKey() : "");
    }
    setConfiguredSignerSelection(selection);
  }, []);

  const scanAgency = async () => {
    if (!data || data.integration.state !== "not_configured" || isScanning || isCreating || awaitingConfigured) return;
    const generation = ++requestGeneration.current;
    const current = () => mounted.current && activeScopeKey.current === scopeKey && requestGeneration.current === generation;
    let phase: "scan" | "create" = "scan";
    let freshProjection: AgencyPayrollSetupProjection | undefined;
    setIsScanning(true);
    setCommandError(null);
    try {
      const fresh = await getSetup(scope, false).unwrap();
      if (!current()) return;
      latestProjectionRef.current = fresh;
      freshProjection = fresh;
      if (fresh.integration.state === "not_configured" && (fresh.preflight.missingFieldCodes.length || fresh.capabilities.canDesignateSigner)) setBootstrapProjection(fresh);
      else if (fresh.integration.state === "not_configured") {
        phase = "create";
        setIsScanning(false);
        setIsCreating(true);
        const created = await bootstrapAgencyPayrollSetup({ ...scope, expectedProjectionRevision: fresh.projectionRevision, checkPayrollProfile: buildAgencyPayrollBootstrapPayload(fresh.preflight.values) }).unwrap();
        if (!current()) return;
        setAwaitingConfigured(true);
      }
    } catch (requestError: unknown) {
      if (!current()) return;
      const missingFieldCodes = phase === "create" ? setupIncompleteFieldCodes(requestError) : [];
      if (missingFieldCodes.length && freshProjection) {
        setBootstrapProjection(freshProjection);
        setSubmissionFieldCodes(missingFieldCodes);
      }
      setCommandError(missingFieldCodes.length ? "Complete the highlighted payroll details." : phase === "create" ? "Payroll setup could not be created. Review the details and try again." : "We could not scan the agency details. Try again.");
      setIsCreating(false);
      setAwaitingConfigured(false);
    } finally {
      if (current()) setIsScanning(false);
    }
  };

  const signerAction = async (command: "designate_signer" | "clear_signer" | "retry_company_sync", authorityAttested?: true, selectedSigner = latestProjectionRef.current?.setup.signerCandidate, suppliedIdempotencyKey?: ReturnType<typeof newIdempotencyKey>) => {
    if (command === "designate_signer" && authorityAttested !== true) {
      setCommandError("Confirm authority for the verified account before designating a signer.");
      return false;
    }
    if (command === "designate_signer" && (!selectedSigner || selectedSigner.designated)) {
      setCommandError("A verified agency owner account is required before a payroll signer can be designated.");
      return false;
    }
    const result = await runCompanyCommand(command, { selectedSigner, idempotencyKey: suppliedIdempotencyKey });
    if (!currentScopeIsActive()) return false;
    if (!result.accepted && typeof result.error === "object" && result.error !== null && "status" in result.error && (result.error as { status?: number }).status === 409) {
      if (command === "designate_signer") {
        configuredSignerIntent.current = null;
        setConfiguredSignerSelection(null);
        setConfiguredSignerIdempotencyKey("");
        setSignerSelectorResetKey((current) => current + 1);
        setCommandError("Payroll setup changed. Reselect the signer and confirm authority before trying again.");
      } else setCommandError("Payroll setup changed. Review the current setup and try again.");
      await Promise.allSettled([unwrapQueryResult(refetch()), unwrapQueryResult(getOverview(scope))]);
    }
    return result.accepted;
  };

  const submitCompanyImplementation = async () => {
    const result = await runCompanyCommand("submit_company_implementation");
    if (!currentScopeIsActive()) return;
    if (!result.accepted && typeof result.error === "object" && result.error !== null && "status" in result.error && (result.error as { status?: number }).status === 409) {
      setCommandError("Payroll setup changed. Review the updated payroll setup status before submitting for review again.");
      await Promise.allSettled([unwrapQueryResult(refetch()), unwrapQueryResult(getOverview(scope))]);
    }
  };

  const retryStatusRefresh = async () => {
    if (!statusRefreshRequired || isRetryingStatusRefresh || commandFlightRef.current?.scopeKey !== scopeKey) return;
    setIsRetryingStatusRefresh(true);
    setCommandError(null);
    const continuation = terminalContinuationRef.current;
    try {
      const projection = await hydrateTerminal();
      if (!currentScopeIsActive()) return;
      clearCommandFlight();
      await continuation?.(projection);
    } catch {
      if (currentScopeIsActive()) {
        setIsRetryingStatusRefresh(false);
        setCommandError("Payroll status refresh is required before another command can be started.");
      }
    }
  };

  if (isLoading && !awaitingConfigured && !data && !latestProjectionRef.current) return <div role="status" aria-label="Loading agency payroll setup" aria-busy="true"><SettingsTabSkeleton variant="form" cardCount={1} /></div>;
  const displayedData = data ?? latestProjectionRef.current;
  if (!displayedData) return <SettingsSectionCard title="Agency Payroll Setup" subtitle="Follow your agency setup from company connection through Check approval."><p role="alert" className="text-sm text-[#8b2d2d]">Payroll setup is unavailable.</p><button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73]">Try again</button></SettingsSectionCard>;

  const { steps, guidanceStepId } = deriveAgencyPayrollJourney(displayedData);
  const completedCount = steps.filter((step) => step.state === "complete").length;
  const guidance = steps.find((step) => step.id === guidanceStepId) ?? steps[0];
  const overallStatus = completedCount === 4 ? "Complete" : guidance.state === "attention" || guidance.state === "blocked" ? "Needs attention" : guidance.state === "waiting" ? "Waiting" : "In progress";
  const overallTone = overallStatus === "Needs attention" || overallStatus === "Waiting" ? "bg-amber-50 text-amber-800" : "bg-[#e8fafa] text-[#006f73]";
  const payrollCommandActive = activePayrollCommand !== null || statusRefreshRequired;
  const pendingCommandLabel = activePayrollCommand ? commandStatusLabels[activePayrollCommand] : "";
  const showInlineCreating = (isCreating || awaitingConfigured) && !bootstrapProjection;
  const canDesignateConfiguredSigner = displayedData.integration.state === "configured" && displayedData.capabilities.canDesignateSigner;

  const stepContent = (step: AgencyPayrollJourneyStep) => {
    if (step.id === "company-connection") return <>{displayedData.integration.state === "not_configured" && displayedData.capabilities.canCreateIntegration ? <button type="button" disabled={isScanning || isCreating || awaitingConfigured || payrollCommandActive} aria-busy={isScanning || showInlineCreating} onClick={() => void scanAgency()} className="inline-flex min-h-11 w-full min-w-[14rem] items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white hover:bg-[#005b5e] disabled:opacity-60 sm:w-auto">{showInlineCreating ? <span role="status" className="inline-flex items-center gap-2"><Loader2 data-testid="agency-payroll-create-spinner" aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Creating payroll setup…</span> : isScanning ? <span role="status" className="inline-flex items-center gap-2"><Loader2 data-testid="agency-payroll-scan-spinner" aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Scanning agency details…</span> : "Create payroll setup"}</button> : null}</>;
    if (step.id === "authorized-signer") return <>{(guidanceStepId === step.id || canDesignateConfiguredSigner || displayedData.setup.designatedSignerPresent) ? <SignerSetupCard projection={displayedData} onAction={signerAction} hideDesignation disabled={payrollCommandActive} /> : null}{canDesignateConfiguredSigner && !displayedData.setup.designatedSignerPresent ? <div className="mt-4"><AuthorizedSignerSelector scope={scope} ownerCandidate={displayedData.setup.signerCandidate} disabled={payrollCommandActive} initialSelection={configuredSignerSelection} resetKey={signerSelectorResetKey} onSelectionChange={onConfiguredSignerSelectionChange} /><button type="button" disabled={payrollCommandActive || !configuredSignerSelection || !configuredSignerIdempotencyKey} aria-busy={payrollCommandActive} aria-describedby={payrollCommandActive ? "agency-payroll-command-status" : undefined} onClick={() => configuredSignerSelection && configuredSignerIdempotencyKey && void signerAction("designate_signer", true, configuredSignerSelection.candidate, configuredSignerIdempotencyKey)} className="mt-4 min-h-11 text-sm font-semibold text-[#006f73] underline disabled:opacity-50">Designate selected signer</button></div> : null}</>;
    if (step.id === "company-onboarding") return <>{(guidanceStepId === step.id || displayedData.capabilities.canRetryCompanySync || displayedData.capabilities.canRefreshCompanyReconciliation || canRequestSession) ? <CompanySetupChecklist projection={displayedData} /> : null}<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{active && canRequestSession ? <Suspense fallback={<p role="status" className="min-h-11 py-2 text-sm text-[#5d626b]">Loading payroll onboarding…</p>}><div className="[&_button]:w-full sm:[&_button]:w-auto"><CheckOnboardModal disabled={payrollCommandActive} actionLabel="Complete payroll onboarding" openingLabel="Opening payroll onboarding..." loadingDialog={agencyOnboardLoadingDialog} requestSession={requestCompanyOnboardSession} onRefetch={ignoreOnboardProgress} onClosed={() => { void reconcileCompany(); }} autoStartKey={mayAutoStart && autoIntent ? autoIntent.key : undefined} onAutoStartConsumed={consumeAutoIntent} cancelPending={!documentVisible} /></div></Suspense> : null}{displayedData.capabilities.canRetryCompanySync ? <button type="button" disabled={payrollCommandActive} onClick={() => void signerAction("retry_company_sync")} className="min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] disabled:opacity-50">Retry company sync</button> : null}{displayedData.capabilities.canRefreshCompanyReconciliation ? <button type="button" disabled={payrollCommandActive} onClick={() => void reconcileCompany()} className="min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] disabled:opacity-50">Refresh payroll status</button> : null}</div></>;
    return <>{guidanceStepId === step.id ? <CompanySetupChecklist projection={displayedData} /> : null}{displayedData.capabilities.canSubmitCompanyImplementation ? <button type="button" disabled={payrollCommandActive} aria-busy={payrollCommandActive} aria-describedby={payrollCommandActive ? "agency-payroll-command-status" : undefined} onClick={() => void submitCompanyImplementation()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">{activePayrollCommand === "submit_company_implementation" ? "Submitting for review…" : "Submit for Check review"}</button> : null}</>;
  };

  return <div className="flex flex-col gap-4"><SettingsSectionCard title="Agency Payroll Setup" subtitle="Follow your agency setup from company connection through Check approval." className="min-h-[420px]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-[#10141a]">{completedCount} of 4 steps complete</p><p className="mt-1 max-w-xl text-sm leading-6 text-[#5d626b]">{guidance.description}</p></div><span aria-live="polite" aria-atomic="true" className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${overallTone}`}>{overallStatus}</span></div>
    <div aria-label={`${completedCount} of 4 payroll setup steps complete`} className="mt-4 grid grid-cols-4 gap-2">{steps.map((step) => <span key={step.id} className={`h-2 rounded-full ${step.state === "complete" ? "bg-[#00a7aa]" : step.state === "upcoming" ? "bg-[#e5e7eb]" : step.state === "blocked" ? "bg-red-500" : step.state === "attention" || step.state === "waiting" ? "bg-amber-400" : "bg-[#00a7aa]"}`} />)}</div>
    {isFetching && !payrollCommandActive ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-[#5d626b]"><Loader2 data-testid="agency-payroll-refresh-spinner" aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Refreshing payroll setup…</p> : null}
    {error ? <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span>Payroll setup could not be refreshed. The last available status is still shown.</span><button type="button" onClick={() => void refetch()} className="ml-2 min-h-11 font-semibold underline">Try again</button></div> : null}
    {active && autoIntent ? <p role="status" className="mt-4 text-sm text-[#5d626b]">Preparing payroll onboarding… Company provisioning will continue in the background.</p> : null}
    {activePayrollCommand ? <p id="agency-payroll-command-status" role="status" aria-label={pendingCommandLabel} aria-live="polite" aria-busy="true" className="mt-4 flex min-h-11 items-center gap-2 text-sm text-[#5d626b]"><Loader2 data-testid={activePayrollCommand === "submit_company_implementation" ? "agency-payroll-submit-spinner" : "agency-payroll-command-spinner"} aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />{pendingCommandLabel}…</p> : null}
    {statusRefreshRequired ? <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#8b2d2d]"><p>Payroll status refresh is required before another command can be started.</p><button type="button" disabled={isRetryingStatusRefresh} onClick={() => void retryStatusRefresh()} className="mt-2 min-h-11 font-semibold underline disabled:opacity-50">Retry status refresh</button></div> : commandError ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#8b2d2d]">{commandError}</p> : null}
    <ol aria-label="Agency payroll setup progress" className="mt-5 divide-y divide-[#edf0f1] border-y border-[#edf0f1] py-4">{steps.map((step, index) => <PayrollJourneyStep key={step.id} title={step.title} status={step.status} state={step.state} icon={journeyIcons[step.id]} last={index === steps.length - 1}>{stepContent(step)}</PayrollJourneyStep>)}</ol>
    {bootstrapProjection ? <AgencyPayrollBootstrapModal open scope={scope} ownerCandidate={bootstrapProjection.setup.signerCandidate} requireSignerConfirmation={bootstrapProjection.capabilities.canDesignateSigner} values={bootstrapProjection.preflight.values} missingFieldCodes={bootstrapProjection.preflight.missingFieldCodes} isSubmitting={isCreating} submissionError={commandError} submissionFieldCodes={submissionFieldCodes} onOpenChange={(open) => { if (!open && !isCreating) { setBootstrapProjection(undefined); setSubmissionFieldCodes([]); setCommandError(null); } }} onSubmit={async (checkPayrollProfile, signerSelection) => {
      const generation = ++requestGeneration.current;
      const current = () => mounted.current && activeScopeKey.current === scopeKey && requestGeneration.current === generation;
      setIsCreating(true); setCommandError(null); setSubmissionFieldCodes([]);
      if (signerSelection) { bootstrapContinuationRef.current = { scopeKey, signerUserUid: signerSelection.candidate.userUid, reconciliationAttempted: false }; commandFlightRef.current = { scopeKey, phase: "awaiting_acceptance", operationId: null }; }
      try {
        const created = await bootstrapAgencyPayrollSetup({ ...scope, expectedProjectionRevision: bootstrapProjection.projectionRevision, checkPayrollProfile, ...(signerSelection ? { signerDesignation: { designatedSignerUserUid: signerSelection.candidate.userUid, designatedSignerIdentityVersion: signerSelection.candidate.identityVersion, authorityAttested: true as const } } : {}) }).unwrap();
        if (!current()) return;
        setBootstrapProjection(undefined); setAwaitingConfigured(true);
        if (signerSelection && created.activeOperation && !terminalOperationStates.has(created.activeOperation.state)) { const token = activationRef.current; if (token?.phase === "awaiting_acceptance") token.phase = "consumed"; activePayrollCommandRef.current = "designate_signer"; setActivePayrollCommand("designate_signer"); watchAcceptedOperation(created.activeOperation, finishBootstrapContinuation); }
        else if (signerSelection) { commandFlightRef.current = null; bootstrapContinuationRef.current = null; }
      } catch (requestError: unknown) {
        if (!current()) return;
        commandFlightRef.current = null; bootstrapContinuationRef.current = null; resumeActivationAfterFailure();
        const missingFieldCodes = setupIncompleteFieldCodes(requestError); setSubmissionFieldCodes(missingFieldCodes); setCommandError(missingFieldCodes.length ? "Complete the highlighted payroll details." : "Payroll setup could not be created. Review the details and try again."); setIsCreating(false); throw requestError;
      }
    }} /> : null}
  </SettingsSectionCard></div>;
}

export default function AgencyPayrollSetupTab({ scope, active = true }: AgencyPayrollSetupTabProps) {
  return <div className="[&_button]:cursor-pointer [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-[#00b4b8] [&_button]:focus-visible:ring-offset-2"><PayrollOperationProvider><AgencyPayrollSetupContent key={JSON.stringify([scope.actorUid, scope.agencyId])} scope={scope} active={active} /></PayrollOperationProvider></div>;
}
