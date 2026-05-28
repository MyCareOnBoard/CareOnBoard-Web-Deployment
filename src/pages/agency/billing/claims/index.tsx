import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import type { Shift } from "@/lib/api/shifts";
import { getCreateBillingClaimErrorMessage } from "@/lib/api/claims";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import ClaimsDashboardHeader from "./components/ClaimsDashboardHeader";
import ClaimsOverviewCards from "./components/ClaimsOverviewCards";
import ClaimsByStatusChart from "./components/ClaimsByStatusChart";
import TopRejectionReasonsChart from "./components/TopRejectionReasonsChart";
import RecentClaimsTable from "./components/RecentClaimsTable";
import { DEFAULT_DATE_RANGE } from "./data/mockClaimsDashboardData";
import type { RecentClaim } from "./data/mockClaimsDashboardData";
import type { SavedBillingClaim } from "@/lib/api/claims";
import { saveGeneratedClaim } from "./utils/saveGeneratedClaim";

const GenerateClaimModal = lazy(() => import("./components/GenerateClaimModal"));
const ClaimReportModal = lazy(() => import("./components/claim-report/ClaimReportModal"));

export default function ClaimsDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [savingClaim, setSavingClaim] = useState(false);
  const [claimedShiftIds, setClaimedShiftIds] = useState<string[]>([]);
  const [claimReport, setClaimReport] = useState<{
    claim: RecentClaim;
    selectedShifts: Shift[];
    savedClaim: SavedBillingClaim;
  } | null>(null);

  const handleGenerateClaim = useCallback(
    async (
      selectedShifts: Shift[],
      context: { serviceCode: string; weekRange?: string },
    ) => {
      if (!user?.agencyId || selectedShifts.length === 0) return;

      setSavingClaim(true);
      try {
        const { savedClaim, anchorClaim } = await saveGeneratedClaim({
          agencyId: user.agencyId,
          selectedShifts,
          serviceCode: context.serviceCode,
          weekRange: context.weekRange,
        });

        setClaimedShiftIds((previous) => [
          ...previous,
          ...savedClaim.shiftIds.filter((id) => !previous.includes(id)),
        ]);
        setClaimReport({
          claim: anchorClaim,
          selectedShifts,
          savedClaim,
        });
        setGenerateOpen(false);

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
    [toast, user?.agencyId],
  );

  const handleTableGenerateClaim = useCallback(
    (claim: RecentClaim, anchorShift: Shift) => {
      const serviceCode = anchorShift.serviceCode?.trim() || claim.serviceCode.trim();
      void handleGenerateClaim([anchorShift], { serviceCode });
    },
    [handleGenerateClaim],
  );

  const handleCloseReportModal = useCallback(() => {
    setClaimReport(null);
  }, []);

  const excludeShiftIds = useMemo(() => new Set(claimedShiftIds), [claimedShiftIds]);

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <ClaimsDashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onGenerateClaimClick={() => setGenerateOpen(true)}
        generateClaimLoading={savingClaim}
      />
      <ClaimsOverviewCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClaimsByStatusChart />
        <TopRejectionReasonsChart />
      </div>

      <RecentClaimsTable
        excludeShiftIds={excludeShiftIds}
        onGenerateClaim={handleTableGenerateClaim}
        generateDisabled={savingClaim}
      />

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
    </div>
  );
}
