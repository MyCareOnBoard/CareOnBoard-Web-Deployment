import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { listShifts, ShiftStatus, type Shift } from "@/lib/api/shifts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { mapShiftsToRecentClaims } from "../utils/shiftToRecentClaim";
import ClaimsClientSearch from "./ClaimsClientSearch";
import RecentClaimRow from "./RecentClaimRow";
import { TABLE_HEADER_CLASS, TABLE_MIN_WIDTH, TABLE_ROW_CLASS } from "./tableColumns";

const EditClientClaimModal = lazy(() => import("./EditClientClaimModal"));
const ClaimReportModal = lazy(() => import("./claim-report/ClaimReportModal"));

const SKELETON_ROW_COUNT = 10;

function RecentClaimSkeletonRow() {
  return (
    <div className={`${TABLE_ROW_CLASS} animate-pulse`} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="h-4 rounded bg-[#eef4f5]" />
      ))}
    </div>
  );
}

function RecentClaimMobileSkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4"
      aria-hidden="true"
    >
      <div className="h-5 w-40 rounded bg-[#eef4f5]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full rounded bg-[#eef4f5]" />
        <div className="h-4 w-3/4 rounded bg-[#eef4f5]" />
        <div className="h-4 w-2/3 rounded bg-[#eef4f5]" />
      </div>
    </div>
  );
}

export default function RecentClaimsTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [claimOverrides, setClaimOverrides] = useState<Record<string, RecentClaim>>({});
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedClientName, setSelectedClientName] = useState<string | undefined>();
  const [editingClaim, setEditingClaim] = useState<RecentClaim | null>(null);
  const [generatingClaim, setGeneratingClaim] = useState<RecentClaim | null>(null);

  useEffect(() => {
    if (!user?.agencyId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchShifts = async () => {
      try {
        setLoading(true);
        const response = await listShifts(
          {
            status: ShiftStatus.COMPLETED,
            limit: 10,
            agencyId: user.agencyId,
            client: true,
          },
          { signal: controller.signal },
        );
        setShifts(response.shifts ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch completed shifts:", error);
        setShifts([]);
        toast({
          title: "Error",
          description: "Failed to load shifts ready to claim. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchShifts();

    return () => {
      controller.abort();
    };
  }, [toast, user?.agencyId]);

  const claims = useMemo(() => {
    return mapShiftsToRecentClaims(shifts).map(
      (claim) => claimOverrides[claim.id] ?? claim,
    );
  }, [claimOverrides, shifts]);

  const filteredClaims = useMemo(() => {
    if (selectedClientName) {
      return claims.filter(
        (claim) => claim.client.toLowerCase() === selectedClientName.toLowerCase(),
      );
    }

    const query = filterQuery.trim().toLowerCase();
    if (!query) return claims;

    return claims.filter((claim) => claim.client.toLowerCase().includes(query));
  }, [claims, filterQuery, selectedClientName]);

  const handleFilterChange = (query: string, clientName?: string) => {
    setFilterQuery(query);
    setSelectedClientName(clientName);
  };

  const handleEditClaim = useCallback((claim: RecentClaim) => {
    setEditingClaim(claim);
  }, []);

  const handleGenerateClaim = useCallback((claim: RecentClaim) => {
    setGeneratingClaim(claim);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingClaim(null);
  }, []);

  const handleCloseReportModal = useCallback(() => {
    setGeneratingClaim(null);
  }, []);

  const handleSaveClaim = useCallback((updated: RecentClaim) => {
    setClaimOverrides((prev) => ({ ...prev, [updated.id]: updated }));
    setEditingClaim(null);
  }, []);

  const emptyMessage = useMemo(() => {
    if (loading) return "";
    if (claims.length === 0) return "No completed shifts found.";
    return "No shifts match your search.";
  }, [claims.length, loading]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Shifts ready to claim</h2>
        <ClaimsClientSearch onFilterChange={handleFilterChange} />
      </div>

      <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e6] bg-white lg:block">
        <div className="overflow-x-auto">
          <div className={TABLE_MIN_WIDTH}>
            <div className={TABLE_HEADER_CLASS}>
              <span>Client</span>
              <span>Staff ID</span>
              <span>Service code</span>
              <span>PA Number</span>
              <span>Service date</span>
              <span>Duration</span>
              <span>Total hours</span>
              <span>Rate</span>
              <span className="text-right">Action</span>
            </div>

            {loading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                <RecentClaimSkeletonRow key={`skeleton-desktop-${index}`} />
              ))
            ) : filteredClaims.length > 0 ? (
              filteredClaims.map((claim) => (
                <RecentClaimRow
                  key={claim.id}
                  variant="desktop"
                  claim={claim}
                  onEditClaim={handleEditClaim}
                  onGenerateClaim={handleGenerateClaim}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {loading ? (
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <RecentClaimMobileSkeletonCard key={`skeleton-mobile-${index}`} />
          ))
        ) : filteredClaims.length > 0 ? (
          filteredClaims.map((claim) => (
            <RecentClaimRow
              key={claim.id}
              variant="mobile"
              claim={claim}
              onEditClaim={handleEditClaim}
              onGenerateClaim={handleGenerateClaim}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#808081]">{emptyMessage}</p>
          </div>
        )}
      </div>

      {editingClaim && (
        <Suspense fallback={null}>
          <EditClientClaimModal
            key={editingClaim.id}
            open
            claim={editingClaim}
            onClose={handleCloseEditModal}
            onSave={handleSaveClaim}
          />
        </Suspense>
      )}
      {generatingClaim && (
        <Suspense fallback={null}>
          <ClaimReportModal
            key={generatingClaim.id}
            open
            claim={generatingClaim}
            onClose={handleCloseReportModal}
          />
        </Suspense>
      )}
    </section>
  );
}
