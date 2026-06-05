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
import ClaimsActionLoadingOverlay, {
  getClaimsActionLoadingCopy,
} from "./components/ClaimsActionLoadingOverlay";
import type { RecentClaim } from "./data/mockClaimsDashboardData";
import { saveGeneratedClaim } from "./utils/saveGeneratedClaim";
import { useClaimsDashboard } from "./hooks/useClaimsDashboard";
import { useGeneratedClaims } from "./hooks/useGeneratedClaims";
import { useReadyToClaim } from "./hooks/useReadyToClaim";
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
    () => mapReadyToClaimRowsToRecentClaims(readyToClaim.rows, readyToClaim.mileageRate),
    [readyToClaim.mileageRate, readyToClaim.rows],
  );
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateInitialGroup, setGenerateInitialGroup] = useState<RecentClaimClientGroup | null>(null);
  const [savingClaim, setSavingClaim] = useState(false);
  const [openingReport, setOpeningReport] = useState<{ claimNumber: string } | null>(null);
  const openingReportRequestIdRef = useRef(0);
  const [mutationSaving, setMutationSaving] = useState(false);
  const [statusModalClaim, setStatusModalClaim] = useState<BillingClaimListItem | null>(null);
  const [cancelModalClaim, setCancelModalClaim] = useState<BillingClaimListItem | null>(null);
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

  const saveClaimBundles = useCallback(
    async (selections: ClaimConfirmSelection[]) => {
      if (!user?.agencyId || selections.length === 0) {
        return;
      }

      setSavingClaim(true);
      try {
        const results: Array<{
          savedClaim: SavedBillingClaim;
          anchorClaim: RecentClaim;
        }> = [];

        for (const selection of selections) {
          if (selection.shifts.length === 0 && selection.rides.length === 0) {
            continue;
          }

          const result = await saveGeneratedClaim({
            agencyId: user.agencyId,
            selectedShifts: selection.shifts,
            selectedRides: selection.rides,
            serviceCode: selection.serviceCode,
            weekRange: selection.weekRange,
          });
          results.push({
            savedClaim: result.savedClaim,
            anchorClaim: result.anchorClaim,
          });
        }

        if (results.length === 0) {
          return;
        }

        setGenerateOpen(false);
        setGenerateInitialGroup(null);
        setActiveTab("saved");
        await refreshAfterCreateOrCancel();

        if (results.length === 1) {
          const only = results[0];
          setClaimReport({
            claim: only.anchorClaim,
            savedClaim: only.savedClaim,
          });
          toast({
            title: `Claim ${only.savedClaim.claimNumber} saved.`,
            description: "Opening report…",
          });
        } else {
          toast({
            title: `${results.length} claims saved.`,
            description: "View them in Generated claims.",
          });
        }
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

  const closeGenerateModal = useCallback(() => {
    if (savingClaim) {
      return;
    }
    setGenerateOpen(false);
    setGenerateInitialGroup(null);
  }, [savingClaim]);

  const handleClientGroupGenerateClaim = useCallback(
    (group: RecentClaimClientGroup) => {
      const hasClaimableEntry = group.claims.some(
        (claim) => claim.sourceType && claim.sourceId && claim.clientId,
      );

      if (!hasClaimableEntry) {
        console.warn("Ready to claim client group missing source metadata", group.clientKey);
        toast({
          title: "Couldn't generate claim",
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
            open
            initialClientGroup={generateInitialGroup}
            saving={savingClaim}
            readyToClaimRows={readyToClaim.rows}
            mileageRate={readyToClaim.mileageRate}
            onClose={closeGenerateModal}
            onConfirm={saveClaimBundles}
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
