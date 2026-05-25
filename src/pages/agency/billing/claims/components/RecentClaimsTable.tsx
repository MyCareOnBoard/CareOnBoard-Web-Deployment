import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { RECENT_CLAIMS, type RecentClaim } from "../data/mockClaimsDashboardData";
import ClaimsClientSearch from "./ClaimsClientSearch";
import RecentClaimRow from "./RecentClaimRow";
import { TABLE_HEADER_CLASS, TABLE_MIN_WIDTH } from "./tableColumns";

const EditClientClaimModal = lazy(() => import("./EditClientClaimModal"));

export default function RecentClaimsTable() {
  const [claims, setClaims] = useState<RecentClaim[]>(() => RECENT_CLAIMS);
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedClientName, setSelectedClientName] = useState<string | undefined>();
  const [editingClaim, setEditingClaim] = useState<RecentClaim | null>(null);

  const filteredClaims = useMemo(() => {
    if (selectedClientName) {
      return claims.filter(
        (claim) => claim.client.toLowerCase() === selectedClientName.toLowerCase()
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

  const handleCloseModal = useCallback(() => {
    setEditingClaim(null);
  }, []);

  const handleSaveClaim = useCallback((updated: RecentClaim) => {
    setClaims((prev) => prev.map((claim) => (claim.id === updated.id ? updated : claim)));
    setEditingClaim(null);
  }, []);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[18px] font-semibold text-[#10141a]">Recent claims</h2>
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

            {filteredClaims.length > 0 ? (
              filteredClaims.map((claim) => (
                <RecentClaimRow
                  key={claim.id}
                  variant="desktop"
                  claim={claim}
                  onEditClaim={handleEditClaim}
                />
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px] font-medium text-[#808081]">No claims match your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {filteredClaims.length > 0 ? (
          filteredClaims.map((claim) => (
            <RecentClaimRow
              key={claim.id}
              variant="mobile"
              claim={claim}
              onEditClaim={handleEditClaim}
            />
          ))
        ) : (
          <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#808081]">No claims match your search.</p>
          </div>
        )}
      </div>

      {editingClaim && (
        <Suspense fallback={null}>
          <EditClientClaimModal
            key={editingClaim.id}
            open
            claim={editingClaim}
            onClose={handleCloseModal}
            onSave={handleSaveClaim}
          />
        </Suspense>
      )}
    </section>
  );
}
