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

export default function ClaimsDashboardPage() {
  const { user } = useAuth();
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
  const [mutationSaving, setMutationSaving] = useState(false);
  const [statusModalClaim, setStatusModalClaim] = useState<BillingClaimListItem | null>(null);
  const [cancelModalClaim, setCancelModalClaim] = useState<BillingClaimListItem | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<OutOfPocketInvoiceListItem | null>(
    null,
  );
  const [claimReport, setClaimReport] = useState<{
    claim: RecentClaim;
    savedClaim: SavedBillingClaim;
  } | null>(null);

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
      if (!user?.agencyId) return;
      if (claimSelections.length === 0 && invoiceSelections.length === 0) return;

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
            agencyId: user.agencyId,
            selectedShifts: selection.shifts,
            selectedRides: selection.rides,
            serviceCode: selection.serviceCode,
            weekRange: selection.weekRange,
          });
          claimResults.push({ savedClaim: result.savedClaim, anchorClaim: result.anchorClaim });
        } catch (error) {
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
            clientId,
            shiftIds: invoiceShiftIds,
            rideIds: invoiceRideIds,
          });
        } catch (error) {
          invoiceError = error;
        } finally {
          setGeneratingInvoice(false);
        }
      }

      await refreshAfterCreateOrCancel();
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
    [refreshAfterCreateOrCancel, toast, user?.agencyId],
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
        console.warn("Ready to bill client group missing source metadata", group.clientKey);
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
      try {
        setOpenInvoice(await getOutOfPocketInvoice(item.id));
      } catch (error) {
        toast({
          title: "Couldn't open invoice",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleConfirmCancelInvoice = useCallback(async () => {
    if (!cancelModalInvoice) return;

    setMutationSaving(true);
    try {
      await cancelOutOfPocketInvoice(cancelModalInvoice.id);
      setCancelModalInvoice(null);
      toast({ title: "Invoice cancelled. Its items are billable again." });
      await refreshAfterCreateOrCancel();
    } catch (error) {
      toast({
        title: "Couldn't cancel invoice",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setMutationSaving(false);
    }
  }, [cancelModalInvoice, refreshAfterCreateOrCancel, toast]);

  const handleCloseReportModal = useCallback(() => {
    setClaimReport(null);
  }, []);

  const handleViewReport = useCallback(
    async (claim: BillingClaimListItem) => {
      const requestId = openingReportRequestIdRef.current + 1;
      openingReportRequestIdRef.current = requestId;
      setOpeningReport({ claimNumber: claim.claimNumber });

      try {
        const detail = await getBillingClaimById(claim.id);

        if (openingReportRequestIdRef.current !== requestId) {
          return;
        }

        setClaimReport({
          claim: buildRecentClaimFromBillingDetail(detail),
          savedClaim: {
            id: detail.id,
            claimNumber: detail.claimNumber,
            status: detail.status,
            rejectionReason: detail.rejectionReason,
            amount: detail.amount,
            clientId: detail.clientId,
            shiftIds: detail.shiftIds,
            reportPrefill: detail.reportPrefill,
          },
        });
      } catch (error) {
        if (openingReportRequestIdRef.current !== requestId) {
          return;
        }

        toast({
          title: "Couldn't open claim report",
          description: getBillingClaimMutationErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        if (openingReportRequestIdRef.current === requestId) {
          setOpeningReport(null);
        }
      }
    },
    [toast],
  );

  const handleConfirmStatusUpdate = useCallback(
    async (payload: { status: Exclude<BillingClaimStatus, "pending">; rejectionReason?: string }) => {
      if (!statusModalClaim) return;

      setMutationSaving(true);
      try {
        await generatedClaims.updateClaimStatus(statusModalClaim.id, payload);
        setStatusModalClaim(null);
        await refreshAfterStatusUpdate();
        toast({
          title: "Claim status updated",
          description: `${statusModalClaim.claimNumber} is now ${payload.status}.`,
        });
      } catch (error) {
        toast({
          title: "Couldn't update claim status",
          description: getBillingClaimMutationErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        setMutationSaving(false);
      }
    },
    [generatedClaims, refreshAfterStatusUpdate, statusModalClaim, toast],
  );

  const handleConfirmCancelClaim = useCallback(async () => {
    if (!cancelModalClaim) return;

    setMutationSaving(true);
    try {
      await generatedClaims.cancelClaim(cancelModalClaim.id);
      setCancelModalClaim(null);
      await refreshAfterCreateOrCancel();
      toast({
        title: "Claim cancelled",
        description: `${cancelModalClaim.claimNumber} was removed and its shifts are claimable again.`,
      });
    } catch (error) {
      toast({
        title: "Couldn't cancel claim",
        description: getBillingClaimMutationErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setMutationSaving(false);
    }
  }, [cancelModalClaim, generatedClaims, refreshAfterCreateOrCancel, toast]);

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

      {claimReport && (
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
