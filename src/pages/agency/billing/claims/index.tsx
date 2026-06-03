import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
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
import ClaimsActionLoadingOverlay, {
  getClaimsActionLoadingCopy,
} from "./components/ClaimsActionLoadingOverlay";
import type { RecentClaim } from "./data/mockClaimsDashboardData";
import { saveGeneratedClaim } from "./utils/saveGeneratedClaim";
import { useClaimsDashboard } from "./hooks/useClaimsDashboard";
import { useGeneratedClaims } from "./hooks/useGeneratedClaims";
import { useReadyToClaim } from "./hooks/useReadyToClaim";
import { mapReadyToClaimRowsToRecentClaims } from "./utils/readyToClaimUtils";
import { getCurrentWeekDateRange } from "./utils/claimsDashboardUtils";
import {
  buildRecentClaimFromSavedClaim,
  STATUS_LABEL_TO_FILTER,
} from "./utils/savedClaimUtils";

const GenerateClaimModal = lazy(() => import("./components/GenerateClaimModal"));
const ClaimReportModal = lazy(() => import("./components/claim-report/ClaimReportModal"));

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
  const readyClaims = useMemo(
    () => mapReadyToClaimRowsToRecentClaims(readyToClaim.rows),
    [readyToClaim.rows],
  );
  const [generateOpen, setGenerateOpen] = useState(false);
  const [savingClaim, setSavingClaim] = useState(false);
  const [openingReport, setOpeningReport] = useState<{ claimNumber: string } | null>(null);
  const openingReportRequestIdRef = useRef(0);
  const [mutationSaving, setMutationSaving] = useState(false);
  const [statusModalClaim, setStatusModalClaim] = useState<BillingClaimListItem | null>(null);
  const [cancelModalClaim, setCancelModalClaim] = useState<BillingClaimListItem | null>(null);
  const [claimReport, setClaimReport] = useState<{
    claim: RecentClaim;
    selectedShifts: Shift[];
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

  const refreshAfterCreateOrCancel = useCallback(async () => {
    await Promise.all([
      dashboard.refetch(),
      generatedClaims.refetch({ force: true }),
      readyToClaim.refetch({ force: true }),
    ]);
  }, [dashboard, generatedClaims, readyToClaim]);

  const refreshAfterStatusUpdate = useCallback(async () => {
    await Promise.all([dashboard.refetch(), generatedClaims.refetch()]);
  }, [dashboard, generatedClaims]);

  const handleGenerateClaim = useCallback(
    async (
      selection: { shifts: Shift[]; rides: MileageRide[] },
      context: { serviceCode: string; weekRange?: string },
    ) => {
      if (
        !user?.agencyId ||
        (selection.shifts.length === 0 && selection.rides.length === 0)
      ) {
        return;
      }

      setSavingClaim(true);
      try {
        const { savedClaim, anchorClaim } = await saveGeneratedClaim({
          agencyId: user.agencyId,
          selectedShifts: selection.shifts,
          selectedRides: selection.rides,
          serviceCode: context.serviceCode,
          weekRange: context.weekRange,
        });

        setClaimReport({
          claim: anchorClaim,
          selectedShifts: selection.shifts,
          savedClaim,
        });
        setGenerateOpen(false);
        setActiveTab("saved");

        await refreshAfterCreateOrCancel();

        toast({
          title: `Claim ${savedClaim.claimNumber} saved.`,
          description: "Opening report…",
        });
      } catch (error) {
        console.error("Failed to save claim:", error);
        toast({
          title: "Couldn't save claim",
          description: getCreateBillingClaimErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        setSavingClaim(false);
      }
    },
    [refreshAfterCreateOrCancel, toast, user?.agencyId],
  );

  const handleTableGenerateClaim = useCallback(
    (claim: RecentClaim) => {
      if (!claim.sourceType || !claim.sourceId || !claim.clientId) {
        console.warn("Ready to claim row missing source metadata", claim.id);
        toast({
          title: "Couldn't generate claim",
          description: "Refresh the list and try again.",
          variant: "destructive",
        });
        return;
      }

      const serviceCode = claim.serviceCode.trim();
      const weekRange = claim.weekRange?.trim() || undefined;

      void handleGenerateClaim(
        {
          shifts:
            claim.sourceType === "shift"
              ? [{ id: claim.sourceId, clientId: claim.clientId, serviceCode } as Shift]
              : [],
          rides:
            claim.sourceType === "ride"
              ? [{ id: claim.sourceId, clientId: claim.clientId, serviceCode } as MileageRide]
              : [],
        },
        { serviceCode, weekRange },
      );
    },
    [handleGenerateClaim, toast],
  );

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

        const anchorShift = detail.shifts[0];
        if (!anchorShift) {
          throw new Error("This claim has no linked shifts.");
        }

        setClaimReport({
          claim: buildRecentClaimFromSavedClaim(detail, anchorShift),
          selectedShifts: detail.shifts,
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
    ? getClaimsActionLoadingCopy("openReport", openingReport.claimNumber)
    : savingClaim && !generateOpen
      ? getClaimsActionLoadingCopy("createClaim")
      : null;

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <ClaimsDashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onGenerateClaimClick={() => setGenerateOpen(true)}
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
          onGenerateClaim={handleTableGenerateClaim}
          generateDisabled={savingClaim || openingReport !== null}
        />
      ) : (
        <SavedClaimsTable
          claims={generatedClaims.claims}
          totalCount={generatedClaims.totalCount}
          loading={generatedClaims.loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onClientSearchChange={handleClientSearchChange}
          onViewReport={(claim) => void handleViewReport(claim)}
          onUpdateStatus={setStatusModalClaim}
          onCancelClaim={setCancelModalClaim}
          actionsDisabled={mutationSaving || openingReport !== null}
        />
      )}

      {generateOpen && (
        <Suspense fallback={null}>
          <GenerateClaimModal
            open={generateOpen}
            saving={savingClaim}
            onClose={() => !savingClaim && setGenerateOpen(false)}
            onConfirm={handleGenerateClaim}
          />
        </Suspense>
      )}

      {claimReport && (
        <Suspense fallback={null}>
          <ClaimReportModal
            key={claimReport.savedClaim.id}
            open
            claim={claimReport.claim}
            selectedShifts={claimReport.selectedShifts}
            savedClaimId={claimReport.savedClaim.id}
            claimNumber={claimReport.savedClaim.claimNumber}
            initialPrefill={claimReport.savedClaim.reportPrefill}
            onClose={handleCloseReportModal}
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

      {claimsActionOverlay && (
        <ClaimsActionLoadingOverlay
          title={claimsActionOverlay.title}
          description={claimsActionOverlay.description}
        />
      )}
    </div>
  );
}
