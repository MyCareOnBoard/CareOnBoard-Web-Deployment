import {validCareerReviewId} from '@/lib/api/career-reconciliation';
import {useSearchParams} from 'react-router';
import {useAssignmentReviewScope} from '@/hooks/useAssignmentReview';
import {canAccessBillingChild} from '@/lib/agency/agency-billing-permissions';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBillingClaimById,
  getBillingClaimMutationErrorMessage,
  getCreateBillingClaimErrorMessage,
  type BillingClaimListItem,
  type BillingClaimStatus,
  type SavedBillingClaim,
} from "@/lib/api/claims";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useSelector } from "react-redux";
import { createAgencyOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import {
  OperationalAgencyProvider,
  useOperationalAgency,
} from "@/lib/operational-agency/OperationalAgencyProvider";
import { resolveEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { agencyDirectoryRoutes } from "@/lib/operational-agency/routes";
import type { RootState } from "@/store/redux/store";
import { UserType } from "@/utils/auth/types/user.types";
import ClaimsDashboardHeader from "./components/ClaimsDashboardHeader";
import ClaimsOverviewCards from "./components/ClaimsOverviewCards";
import ClaimsByStatusChart from "./components/ClaimsByStatusChart";
import TopRejectionReasonsChart from "./components/TopRejectionReasonsChart";
import RecentClaimsTable from "./components/RecentClaimsTable";
import SavedClaimsTable from "./components/SavedClaimsTable";
import ClaimsWorkspaceTabs, { type ClaimsWorkspaceTab } from "./components/ClaimsWorkspaceTabs";
import UpdateClaimStatusModal from "./components/UpdateClaimStatusModal";
import CancelClaimDialog from "./components/CancelClaimDialog";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import ClaimsActionLoadingOverlay, {
  getClaimsActionLoadingCopy,
} from "./components/ClaimsActionLoadingOverlay";
import type { RecentClaim } from "./data/mockClaimsDashboardData";
import { saveGeneratedClaim } from "./utils/saveGeneratedClaim";
import { useClaimsDashboard } from "./hooks/useClaimsDashboard";
import { useGeneratedClaims } from "./hooks/useGeneratedClaims";
import { useReadyToClaim } from "./hooks/useReadyToClaim";
import { useOutOfPocketReady } from "./hooks/useOutOfPocketReady";
import { useOutOfPocketInvoices } from "./hooks/useOutOfPocketInvoices";
import {
  cancelOutOfPocketInvoice,
  createOutOfPocketInvoice,
  getOutOfPocketInvoice,
  type OutOfPocketInvoiceDetail,
  type OutOfPocketInvoiceListItem,
} from "@/lib/api/out-of-pocket";
import type { ClaimConfirmSelection } from "./utils/claimBundleUtils";
import type { RecentClaimClientGroup } from "./utils/groupRecentClaimsByClient";
import { mapReadyToClaimRowsToRecentClaims } from "./utils/readyToClaimUtils";
import { getCurrentWeekDateRange } from "./utils/claimsDashboardUtils";
import {
  buildRecentClaimFromBillingDetail,
  STATUS_LABEL_TO_FILTER,
} from "./utils/savedClaimUtils";

const GenerateClaimModal = lazy(() => import("./components/GenerateClaimModal"));
const ClaimReportModal = lazy(() => import("./components/claim-report/ClaimReportModal"));
const OutOfPocketInvoiceModal = lazy(
  () => import("../out-of-pocket/components/OutOfPocketInvoiceModal"),
);

export function ClaimsDashboardContent() {
  const { agencyId, actor, mode } = useOperationalAgency();
  const {user}=useAuth();
  const authScope=useAssignmentReviewScope();
  const [reportParams,setReportParams]=useSearchParams();
  const reportClaimId=reportParams.get('claimId');
  const reportClientId=reportParams.get('clientId');
  const reportAgencyId=reportParams.get('agencyId');
  const canViewReport=user?.profile?.isActive!==false && !['inactive','suspended','disabled','deleted'].includes(user?.profile?.status??'') && (actor==='super_admin'?Boolean(user?.profile?.accessList?.includes('Billing Management')):canAccessBillingChild(user?.userType,user?.profile?.accessList,'Claims View'));
  const reportScope=JSON.stringify([authScope,agencyId,actor,mode,canViewReport,reportClientId,reportClaimId]);
  const currentReportScope=useRef(reportScope);currentReportScope.current=reportScope;
  const [reportSelectionError,setReportSelectionError]=useState('');
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(getCurrentWeekDateRange);
  const [activeTab, setActiveTab] = useState<ClaimsWorkspaceTab>("shifts");
  const [statusFilter, setStatusFilter] = useState<BillingClaimStatus | "all">("all");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientName, setSelectedClientName] = useState<string | undefined>();
  const dashboard = useClaimsDashboard(dateRange);
  const generatedClaims = useGeneratedClaims(dateRange, {
    enabled: activeTab === "saved",
    statusFilter,
    clientSearch,
    selectedClientName,
  });
  const readyToClaim = useReadyToClaim({
    enabled: activeTab === "shifts",
  });
  const oopReady = useOutOfPocketReady({ enabled: activeTab === "shifts" });
  const oopInvoices = useOutOfPocketInvoices({ enabled: activeTab === "saved" });
  const readyClaims = useMemo(() => {
    const merged = [
      ...mapReadyToClaimRowsToRecentClaims(readyToClaim.rows, readyToClaim.mileageRate, "claims"),
      ...mapReadyToClaimRowsToRecentClaims(oopReady.rows, oopReady.mileageRate, "out-of-pocket"),
    ];
    const byId = new Map<string, RecentClaim>();
    for (const claim of merged) {
      const existing = byId.get(claim.id);
      if (existing) {
        existing.needsClaim = existing.needsClaim || claim.needsClaim;
        existing.needsInvoice = existing.needsInvoice || claim.needsInvoice;
      } else {
        byId.set(claim.id, { ...claim });
      }
    }
    return [...byId.values()];
  }, [readyToClaim.mileageRate, readyToClaim.rows, oopReady.mileageRate, oopReady.rows]);

  // All ready rows across both legs (deduped) so the generate modal sees a client's claim AND
  // out-of-pocket lines and can split a `both` selection into both legs.
  const allReadyRows = useMemo(() => {
    const byId = new Map<string, (typeof readyToClaim.rows)[number]>();
    for (const row of [...readyToClaim.rows, ...oopReady.rows]) {
      const existing = byId.get(row.id);
      if (existing) {
        existing.needsClaim = existing.needsClaim || row.needsClaim;
        existing.needsInvoice = existing.needsInvoice || row.needsInvoice;
      } else {
        byId.set(row.id, { ...row });
      }
    }
    return [...byId.values()];
  }, [readyToClaim.rows, oopReady.rows]);
  const modalMileageRate = readyToClaim.mileageRate || oopReady.mileageRate;
  const [openInvoice, setOpenInvoice] = useState<OutOfPocketInvoiceDetail | null>(null);

  // Out-of-pocket invoices should respect the Generated tab's filters too. A claim-specific
  // status (pending/paid/rejected) doesn't apply to invoices, so hide them when one is chosen;
  // otherwise filter by the same client search/selection used for claims.
  const filteredOopInvoices = useMemo(() => {
    if (statusFilter !== "all") return [];
    const name = selectedClientName?.trim().toLowerCase();
    const query = clientSearch.trim().toLowerCase();
    if (name) {
      return oopInvoices.invoices.filter((inv) => (inv.clientName ?? "").toLowerCase() === name);
    }
    if (query) {
      return oopInvoices.invoices.filter((inv) =>
        (inv.clientName ?? "").toLowerCase().includes(query),
      );
    }
    return oopInvoices.invoices;
  }, [oopInvoices.invoices, statusFilter, selectedClientName, clientSearch]);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateInitialGroup, setGenerateInitialGroup] = useState<RecentClaimClientGroup | null>(null);
  const [savingClaim, setSavingClaim] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [openingReport, setOpeningReport] = useState<{ claimNumber: string } | null>(null);
  const openingReportRequestIdRef = useRef(0);
  const openingReportControllerRef = useRef<AbortController | null>(null);
  const openingInvoiceControllerRef = useRef<AbortController | null>(null);
  const mutationRequestIdRef = useRef(0);
  const mutationControllerRef = useRef<AbortController | null>(null);
  const [mutationSaving, setMutationSaving] = useState(false);
  const [statusModalClaim, setStatusModalClaim] = useState<BillingClaimListItem | null>(null);
  const [cancelModalClaim, setCancelModalClaim] = useState<BillingClaimListItem | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<OutOfPocketInvoiceListItem | null>(
    null,
  );
  const [claimReport, setClaimReport] = useState<{
    claim: RecentClaim;
    savedClaim: SavedBillingClaim;
    scopeKey: string;
  } | null>(null);

  useEffect(() => () => {
    openingReportRequestIdRef.current += 1;
    openingReportControllerRef.current?.abort();
    openingInvoiceControllerRef.current?.abort();
    mutationRequestIdRef.current += 1;
    mutationControllerRef.current?.abort();
  }, []);

  const beginMutation = useCallback(() => {
    mutationControllerRef.current?.abort();
    const requestId = mutationRequestIdRef.current + 1;
    mutationRequestIdRef.current = requestId;
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    return { requestId, controller };
  }, []);

  const isMutationCurrent = useCallback(
    (requestId: number, controller: AbortController) =>
      mutationRequestIdRef.current === requestId
      && mutationControllerRef.current === controller
      && !controller.signal.aborted,
    [],
  );

  useEffect(() => {
    if (!dashboard.error) {
      return;
    }

    toast({
      title: "Couldn't load claims dashboard",
      description: dashboard.error,
      variant: "destructive",
    });
  }, [dashboard.error, toast]);

  useEffect(() => {
    if (!generatedClaims.error) {
      return;
    }

    toast({
      title: "Couldn't load generated claims",
      description: generatedClaims.error,
      variant: "destructive",
    });
  }, [generatedClaims.error, toast]);

  useEffect(() => {
    if (!readyToClaim.error) {
      return;
    }

    toast({
      title: "Couldn't load items ready to claim",
      description: readyToClaim.error,
      variant: "destructive",
    });
  }, [readyToClaim.error, toast]);

  useEffect(() => {
    if (!oopReady.error) return;
    toast({
      title: "Couldn't load out-of-pocket items",
      description: oopReady.error,
      variant: "destructive",
    });
  }, [oopReady.error, toast]);

  useEffect(() => {
    if (!oopInvoices.error) return;
    toast({
      title: "Couldn't load out-of-pocket invoices",
      description: oopInvoices.error,
      variant: "destructive",
    });
  }, [oopInvoices.error, toast]);

  const refreshAfterCreateOrCancel = useCallback(async () => {
    await Promise.all([
      dashboard.refetch(),
      generatedClaims.refetch({ force: true }),
      readyToClaim.refetch({ force: true }),
      oopReady.refetch({ force: true }),
      oopInvoices.refetch({ force: true }),
    ]);
  }, [dashboard, generatedClaims, readyToClaim, oopReady, oopInvoices]);

  const refreshAfterStatusUpdate = useCallback(async () => {
    await Promise.all([dashboard.refetch(), generatedClaims.refetch()]);
  }, [dashboard, generatedClaims]);

  // Coverage-aware generate: a `both` selection bills the payer claim leg AND the out-of-pocket
  // invoice leg in one action, with per-leg outcome tracking so one can succeed while the other
  // fails (the failed leg stays in Ready to bill and can be retried without duplicating the other).
  const saveCoverageBundles = useCallback(
    async (
      clientId: string,
      claimSelections: ClaimConfirmSelection[],
      invoiceSelections: ClaimConfirmSelection[],
    ) => {
      if (claimSelections.length === 0 && invoiceSelections.length === 0) return;

      const { requestId, controller } = beginMutation();
      setSavingClaim(true);
      let claimError: unknown = null;
      let invoiceError: unknown = null;
      const claimResults: Array<{ savedClaim: SavedBillingClaim; anchorClaim: RecentClaim }> = [];
      let createdInvoice: OutOfPocketInvoiceDetail | null = null;

      // Payer claim leg — one claim per bundle (shifts XOR rides, per service/week).
      for (const selection of claimSelections) {
        if (selection.shifts.length === 0 && selection.rides.length === 0) continue;
        try {
          const result = await saveGeneratedClaim({
            context: { agencyId },
            selectedShifts: selection.shifts,
            selectedRides: selection.rides,
            serviceCode: selection.serviceCode,
            weekRange: selection.weekRange,
            signal: controller.signal,
          });
          if (!isMutationCurrent(requestId, controller)) return;
          claimResults.push({ savedClaim: result.savedClaim, anchorClaim: result.anchorClaim });
        } catch (error) {
          if (!isMutationCurrent(requestId, controller)) return;
          claimError = error;
          break;
        }
      }

      // Out-of-pocket invoice leg — one invoice across the selected items.
      const invoiceShiftIds = invoiceSelections.flatMap((s) => s.shifts.map((x) => x.id));
      const invoiceRideIds = invoiceSelections.flatMap((s) => s.rides.map((x) => x.id));
      if (invoiceShiftIds.length > 0 || invoiceRideIds.length > 0) {
        setGeneratingInvoice(true);
        try {
          createdInvoice = await createOutOfPocketInvoice({
            context: { agencyId },
            payload: {
              clientId,
              shiftIds: invoiceShiftIds,
              rideIds: invoiceRideIds,
            },
            signal: controller.signal,
          });
          if (!isMutationCurrent(requestId, controller)) return;
        } catch (error) {
          if (!isMutationCurrent(requestId, controller)) return;
          invoiceError = error;
        } finally {
          if (isMutationCurrent(requestId, controller)) setGeneratingInvoice(false);
        }
      }

      await refreshAfterCreateOrCancel();
      if (!isMutationCurrent(requestId, controller)) return;
      setSavingClaim(false);

      if (!claimError && !invoiceError) {
        setGenerateOpen(false);
        setGenerateInitialGroup(null);
        setActiveTab("saved");
        if (createdInvoice) setOpenInvoice(createdInvoice);
        const parts: string[] = [];
        if (claimResults.length === 1) {
          parts.push(`Claim ${claimResults[0].savedClaim.claimNumber} saved`);
        } else if (claimResults.length > 1) {
          parts.push(`${claimResults.length} claims saved`);
        }
        if (createdInvoice) parts.push(`Invoice ${createdInvoice.invoiceNumber} created`);
        toast({ title: parts.join(" · ") || "Nothing to bill" });
      } else {
        toast({
          title: "Some bills weren't generated",
          description: [
            claimError
              ? `${
                  claimResults.length > 0
                    ? `${claimResults.length} claim${claimResults.length === 1 ? "" : "s"} created, then a `
                    : ""
                }claim failed: ${getCreateBillingClaimErrorMessage(claimError)}`
              : claimResults.length > 0
                ? `${claimResults.length} claim${claimResults.length === 1 ? "" : "s"} created.`
                : null,
            invoiceError
              ? `Invoice failed: ${invoiceError instanceof Error ? invoiceError.message : "unknown error"}`
              : createdInvoice
                ? "Invoice created."
                : null,
          ]
            .filter(Boolean)
            .join(" "),
          variant: "destructive",
        });
      }
    },
    [agencyId, beginMutation, isMutationCurrent, refreshAfterCreateOrCancel, toast],
  );

  const closeGenerateModal = useCallback(() => {
    if (savingClaim) {
      return;
    }
    setGenerateOpen(false);
    setGenerateInitialGroup(null);
  }, [savingClaim]);

  const handleClientGroupGenerateClaim = useCallback(
    (group: RecentClaimClientGroup) => {
      const hasBillableEntry = group.claims.some(
        (claim) => claim.sourceType && claim.sourceId && claim.clientId,
      );

      if (!hasBillableEntry) {
        console.warn("Ready to bill client group missing source metadata.");
        toast({
          title: "Couldn't open billing",
          description: "Refresh the list and try again.",
          variant: "destructive",
        });
        return;
      }

      setGenerateInitialGroup(group);
      setGenerateOpen(true);
    },
    [toast],
  );

  const handleViewInvoice = useCallback(
    async (item: OutOfPocketInvoiceListItem) => {
      openingInvoiceControllerRef.current?.abort();
      const controller = new AbortController();
      openingInvoiceControllerRef.current = controller;
      try {
        const detail = await getOutOfPocketInvoice({
          context: { agencyId },
          invoiceId: item.id,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setOpenInvoice(detail);
      } catch (error) {
        if (controller.signal.aborted) return;
        toast({
          title: "Couldn't open invoice",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      }
    },
    [agencyId, toast],
  );

  const handleConfirmCancelInvoice = useCallback(async () => {
    if (!cancelModalInvoice) return;

    const { requestId, controller } = beginMutation();
    setMutationSaving(true);
    try {
      await cancelOutOfPocketInvoice({
        context: { agencyId },
        invoiceId: cancelModalInvoice.id,
        signal: controller.signal,
      });
      if (!isMutationCurrent(requestId, controller)) return;
      setCancelModalInvoice(null);
      await refreshAfterCreateOrCancel();
      if (!isMutationCurrent(requestId, controller)) return;
      toast({ title: "Invoice cancelled. Its items are billable again." });
    } catch (error) {
      if (!isMutationCurrent(requestId, controller)) return;
      toast({
        title: "Couldn't cancel invoice",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      if (isMutationCurrent(requestId, controller)) setMutationSaving(false);
    }
  }, [
    agencyId,
    beginMutation,
    cancelModalInvoice,
    isMutationCurrent,
    refreshAfterCreateOrCancel,
    toast,
  ]);

  const handleCloseReportModal = useCallback(() => {
    openingReportRequestIdRef.current++;
    openingReportControllerRef.current?.abort();
    setClaimReport(null);setOpeningReport(null);
    setReportParams(previous=>{const next=new URLSearchParams(previous);next.delete('claimId');next.delete('clientId');return next;},{replace:true});
  }, [setReportParams]);
  useEffect(()=>{
    setClaimReport(null);setOpeningReport(null);
    return()=>{openingReportRequestIdRef.current++;openingReportControllerRef.current?.abort();};
  },[reportScope]);
  const handleViewReport = useCallback(
    async (claim: Pick<BillingClaimListItem,'id'|'clientId'> & {claimNumber?:string}) => {
      if(!canViewReport)return;
      const capturedScope=reportScope;
      const requestId = ++openingReportRequestIdRef.current;
      openingReportControllerRef.current?.abort();
      const controller = new AbortController();
      openingReportControllerRef.current = controller;
      setClaimReport(null);
      setOpeningReport({ claimNumber: claim.claimNumber || claim.id });
      const current=()=>openingReportRequestIdRef.current===requestId&&!controller.signal.aborted&&currentReportScope.current===capturedScope;
      try {
        const detail = await getBillingClaimById({context:{agencyId},claimId:claim.id,signal:controller.signal});
        if(!current())return;
        if(detail.id!==claim.id || detail.clientId!==claim.clientId)throw new Error('Claim unavailable.');
        setClaimReport({
          scopeKey:capturedScope,
          claim: buildRecentClaimFromBillingDetail(detail),
          savedClaim: {
            id: detail.id, claimNumber: detail.claimNumber, status: detail.status,
            rejectionReason: detail.rejectionReason, amount: detail.amount,
            clientId: detail.clientId, shiftIds: detail.shiftIds, reportPrefill: detail.reportPrefill,
          },
        });
      } catch (error) {
        if(!current())return;
        toast({title:"Couldn't open claim report",description:getBillingClaimMutationErrorMessage(error),variant:"destructive"});
      } finally {if(current())setOpeningReport(null);}
    },[agencyId,toast,canViewReport,reportScope],
  );
  useEffect(()=>{
    setReportSelectionError('');
    if(reportClaimId===null && reportClientId===null)return;
    if(!validCareerReviewId(reportClaimId)||!validCareerReviewId(reportClientId)||(reportAgencyId && reportAgencyId!==agencyId)){
      setReportSelectionError('This report selection is unavailable. Open a claim from the billing workspace.');return;
    }
    if(!canViewReport){setReportSelectionError('Claims View access is required to open this report.');return;}
    void handleViewReport({id:reportClaimId!,clientId:reportClientId!});
    return()=>{openingReportRequestIdRef.current++;openingReportControllerRef.current?.abort();setClaimReport(null);setOpeningReport(null);};
  },[reportClaimId,reportClientId,reportAgencyId,agencyId,canViewReport,handleViewReport]);

  const handleConfirmStatusUpdate = useCallback(
    async (payload: { status: Exclude<BillingClaimStatus, "pending">; rejectionReason?: string }) => {
      if (!statusModalClaim) return;

      const { requestId, controller } = beginMutation();
      setMutationSaving(true);
      try {
        await generatedClaims.updateClaimStatus(statusModalClaim.id, payload, controller.signal);
        if (!isMutationCurrent(requestId, controller)) return;
        setStatusModalClaim(null);
        await refreshAfterStatusUpdate();
        if (!isMutationCurrent(requestId, controller)) return;
        toast({
          title: "Claim status updated",
          description: `${statusModalClaim.claimNumber} is now ${payload.status}.`,
        });
      } catch (error) {
        if (!isMutationCurrent(requestId, controller)) return;
        toast({
          title: "Couldn't update claim status",
          description: getBillingClaimMutationErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        if (isMutationCurrent(requestId, controller)) setMutationSaving(false);
      }
    },
    [
      beginMutation,
      generatedClaims,
      isMutationCurrent,
      refreshAfterStatusUpdate,
      statusModalClaim,
      toast,
    ],
  );

  const handleConfirmCancelClaim = useCallback(async () => {
    if (!cancelModalClaim) return;

    const { requestId, controller } = beginMutation();
    setMutationSaving(true);
    try {
      await generatedClaims.cancelClaim(cancelModalClaim.id, controller.signal);
      if (!isMutationCurrent(requestId, controller)) return;
      setCancelModalClaim(null);
      await refreshAfterCreateOrCancel();
      if (!isMutationCurrent(requestId, controller)) return;
      toast({
        title: "Claim cancelled",
        description: `${cancelModalClaim.claimNumber} was removed and its shifts are claimable again.`,
      });
    } catch (error) {
      if (!isMutationCurrent(requestId, controller)) return;
      toast({
        title: "Couldn't cancel claim",
        description: getBillingClaimMutationErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      if (isMutationCurrent(requestId, controller)) setMutationSaving(false);
    }
  }, [
    beginMutation,
    cancelModalClaim,
    generatedClaims,
    isMutationCurrent,
    refreshAfterCreateOrCancel,
    toast,
  ]);

  const handleStatusSegmentClick = useCallback((segmentLabel: string) => {
    const nextFilter = STATUS_LABEL_TO_FILTER[segmentLabel];
    if (!nextFilter) {
      return;
    }

    setActiveTab("saved");
    setStatusFilter(nextFilter);
  }, []);

  const handleClientSearchChange = useCallback((query: string, clientName?: string) => {
    setClientSearch(query);
    setSelectedClientName(clientName);
  }, []);

  const claimsActionOverlay = openingReport
    ? getClaimsActionLoadingCopy(openingReport.claimNumber)
    : generatingInvoice
      ? { title: "Generating invoice", description: "Creating the out-of-pocket invoice…" }
      : null;

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      {reportSelectionError&&<p role="alert">{reportSelectionError}</p>}
      <ClaimsDashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onGenerateClaimClick={() => {
          setGenerateInitialGroup(null);
          setGenerateOpen(true);
        }}
        generateClaimLoading={savingClaim && generateOpen}
      />
      <ClaimsOverviewCards stats={dashboard.overviewStats} loading={dashboard.loading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClaimsByStatusChart
          chart={dashboard.statusChart}
          loading={dashboard.loading}
          onStatusSegmentClick={handleStatusSegmentClick}
        />
        <TopRejectionReasonsChart chart={dashboard.rejectionChart} loading={dashboard.loading} />
      </div>

      <ClaimsWorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "shifts" ? (
        <RecentClaimsTable
          claims={readyClaims}
          loading={readyToClaim.loading}
          truncated={readyToClaim.truncated}
          onGenerateClaim={handleClientGroupGenerateClaim}
          generateDisabled={savingClaim || openingReport !== null}
        />
      ) : (
        <SavedClaimsTable
          claims={generatedClaims.claims}
          totalCount={generatedClaims.totalCount}
          loading={generatedClaims.loading || oopInvoices.loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClientSearchChange={handleClientSearchChange}
          onViewReport={(claim) => void handleViewReport(claim)}
          onUpdateStatus={setStatusModalClaim}
          onCancelClaim={setCancelModalClaim}
          actionsDisabled={mutationSaving || openingReport !== null}
          invoices={filteredOopInvoices}
          onViewInvoice={(invoice) => void handleViewInvoice(invoice)}
          onCancelInvoice={setCancelModalInvoice}
        />
      )}

      {generateOpen && (
        <Suspense fallback={null}>
          <GenerateClaimModal
            open
            initialClientGroup={generateInitialGroup}
            saving={savingClaim}
            readyToClaimRows={allReadyRows}
            mileageRate={modalMileageRate}
            onClose={closeGenerateModal}
            onGenerate={saveCoverageBundles}
          />
        </Suspense>
      )}

      {claimReport && canViewReport && claimReport.scopeKey===reportScope && (
        <Suspense fallback={null}>
          <ClaimReportModal
            key={claimReport.savedClaim.id}
            open
            claim={claimReport.claim}
            savedClaimId={claimReport.savedClaim.id}
            claimNumber={claimReport.savedClaim.claimNumber}
            initialPrefill={claimReport.savedClaim.reportPrefill}
            onClose={handleCloseReportModal}
          />
        </Suspense>
      )}

      {openInvoice && (
        <Suspense fallback={null}>
          <OutOfPocketInvoiceModal
            key={openInvoice.id}
            open
            invoice={openInvoice}
            onClose={() => setOpenInvoice(null)}
            onSent={() => void oopInvoices.refetch({ force: true })}
          />
        </Suspense>
      )}

      <UpdateClaimStatusModal
        open={Boolean(statusModalClaim)}
        claim={statusModalClaim}
        saving={mutationSaving}
        onClose={() => !mutationSaving && setStatusModalClaim(null)}
        onConfirm={handleConfirmStatusUpdate}
      />

      <CancelClaimDialog
        open={Boolean(cancelModalClaim)}
        claim={cancelModalClaim}
        saving={mutationSaving}
        onClose={() => !mutationSaving && setCancelModalClaim(null)}
        onConfirm={handleConfirmCancelClaim}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(cancelModalInvoice)}
        onClose={() => !mutationSaving && setCancelModalInvoice(null)}
        onConfirm={() => void handleConfirmCancelInvoice()}
        isDeleting={mutationSaving}
        title="Cancel this invoice?"
        message={
          cancelModalInvoice
            ? `Invoice ${cancelModalInvoice.invoiceNumber} will be deleted and its items will become billable again.`
            : "This invoice will be deleted and its items will become billable again."
        }
        confirmText="Cancel invoice"
        cancelText="Keep invoice"
      />

      {claimsActionOverlay && (
        <ClaimsActionLoadingOverlay
          title={claimsActionOverlay.title}
          description={claimsActionOverlay.description}
        />
      )}
    </div>
  );
}

export default function ClaimsDashboardPage() {
  const { agencyId } = useOperationalAgency();
  return <ClaimsDashboardContent key={agencyId} />;
}

export function AgencyClaimsDashboardPage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const supportedClientTypes = user?.agency?.supportedClientTypes ?? [];
  const storedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const mode = resolveEffectiveAgencyMode(supportedClientTypes, storedMode);
  const data = useMemo(() => createAgencyOperationalDataAdapter(agencyId), [agencyId]);
  const accessList = user?.profile?.accessList ?? [];
  const isAgencyOwner = user?.userType === UserType.AGENCY;

  if (!agencyId) {
    return <p role="alert" className="px-4 py-8 text-sm text-[#808081]">Sign in again to manage billing.</p>;
  }

  return (
    <OperationalAgencyProvider
      key={agencyId}
      actor="agency"
      agencyId={agencyId}
      agency={{
        id: agencyId,
        name: user?.agency?.name || user?.fullName || "Agency",
        status: "active",
        supportedClientTypes,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }}
      mode={mode}
      capabilities={{
        canManageShifts: true,
        canManageBilling: true,
        shiftMaintenance: true,
        canAccessClientDirectory: isAgencyOwner || accessList.includes("Client Management"),
        canAccessStaffDirectory: isAgencyOwner || accessList.includes("DSP Management"),
      }}
      directoryRoutes={agencyDirectoryRoutes}
      data={data}
    >
      <ClaimsDashboardPage />
    </OperationalAgencyProvider>
  );
}
