import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Navigation } from "lucide-react";
import MileageFiltersBar from "./components/MileageFiltersBar";
import { Skeleton } from "@/components/ui/skeleton";
import MileageRideRow, {
  MileageRideRowSkeleton,
  MileageTableHeader,
} from "./components/MileageRideRow";
import { MILEAGE_TABLE_MIN_WIDTH } from "./components/mileageTableColumns";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import AddMileageModal from "./components/AddMileageModal";
import RideDetailModal from "./components/RideDetailModal";
import AddManualMileageModal from "../../userPanel/mileage/components/AddManualMileageModal";
import BillingDateRangeModal from "@/pages/agency/billing/components/BillingDateRangeModal";
import { mileageApi, MileageRide } from "@/lib/api/mileage";
import { useAuth } from "@/utils/auth";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/redux/store";

const LIMIT = 10;

type StatusFilter = "all" | "active" | "missed" | "completed" | "cancelled";
type ManualFilter = "all" | "manual" | "tracked";

function parseScheduledDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && v !== null) {
    const s =
      (v as { seconds?: number; _seconds?: number }).seconds ??
      (v as { _seconds?: number })._seconds;
    if (typeof s === "number") return new Date(s * 1000);
  }
  return null;
}

export default function MileagePage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<MileageRide | null>(null);
  const [viewingRide, setViewingRide] = useState<MileageRide | null>(null);
  const [rideToDelete, setRideToDelete] = useState<MileageRide | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<MileageRide | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [manualFilter, setManualFilter] = useState<ManualFilter>("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [showDateModal, setShowDateModal] = useState(false);

  const fetchRides = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mileageApi.listAgency({
        limit: LIMIT,
        offset: currentOffset,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        isManual: manualFilter === "manual" ? true : manualFilter === "tracked" ? false : undefined,
        clientType: selectedMode,
      });
      setRides(res.data ?? []);
      setTotalCount(res.pagination?.count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mileage");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, manualFilter, selectedMode]);

  useEffect(() => {
    fetchRides(offset);
  }, [fetchRides, offset]);

  // Reset to first page when server-side filters change
  useEffect(() => {
    setOffset(0);
  }, [dateRange, manualFilter, selectedMode]);

  const handleMileageCreated = () => {
    fetchRides(offset);
  };

  const handleEditRide = (ride: MileageRide) => {
    setEditingRide(ride);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (ride: MileageRide) => setRideToDelete(ride);

  const handleDeleteConfirm = async () => {
    if (!rideToDelete) return;
    setIsDeleting(true);
    try {
      await mileageApi.deleteAgency(rideToDelete.id);
      setRideToDelete(null);
      await fetchRides(offset);
    } catch (e) {
      console.error("Failed to delete ride:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelClick = (ride: MileageRide) => setRideToCancel(ride);

  const handleCancelConfirm = async () => {
    if (!rideToCancel) return;
    setIsCancelling(true);
    try {
      await mileageApi.cancelAgency(rideToCancel.id);
      setRideToCancel(null);
      await fetchRides(offset);
    } catch (e) {
      console.error("Failed to cancel ride:", e);
    } finally {
      setIsCancelling(false);
    }
  };

  const now = new Date();

  const activeCount = rides.filter((r) => {
    if (r.status === "in_progress" || r.status === "paused") return true;
    if (r.status === "scheduled") {
      const d = parseScheduledDate(r.scheduledStartTime);
      return d === null || d >= now;
    }
    return false;
  }).length;
  const completedCount = rides.filter((r) => r.status === "completed").length;
  const cancelledCount = rides.filter((r) => r.status === "cancelled").length;
  const missedCount = rides.filter((r) => {
    if (r.status !== "scheduled") return false;
    const d = parseScheduledDate(r.scheduledStartTime);
    return d !== null && d < now;
  }).length;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const filteredRides = useMemo(() => {
    let list = rides;

    if (statusFilter === "active") {
      list = list.filter((r) => {
        if (r.status === "in_progress" || r.status === "paused") return true;
        if (r.status === "scheduled") {
          const d = parseScheduledDate(r.scheduledStartTime);
          return d === null || d >= now;
        }
        return false;
      });
    } else if (statusFilter === "missed") {
      list = list.filter((r) => {
        if (r.status !== "scheduled") return false;
        const d = parseScheduledDate(r.scheduledStartTime);
        return d !== null && d < now;
      });
    } else if (statusFilter === "completed") {
      list = list.filter((r) => r.status === "completed");
    } else if (statusFilter === "cancelled") {
      list = list.filter((r) => r.status === "cancelled");
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.clientName?.toLowerCase().includes(q) ||
          r.caregiverName?.toLowerCase().includes(q) ||
          r.serviceCode?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rides, statusFilter, searchTerm]);

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
            Mileage
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#00b8d4] hover:bg-[#00a0bd] text-white rounded-full px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 h-auto text-[13px] sm:text-[14px] lg:text-[15px] font-semibold shadow-none"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add Mileage
          </Button>
        </div>
      </div>

      {/* Ride Overview Section */}
      <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0">
          <div>
            <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
              Mileage Overview
            </h2>
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
              Overview of all scheduled and completed mileage
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {loading ? (
              [["#22c55e", "Active"], ["#00b4b8", "Completed"], ["#f59e0b", "Missed"], ["#ef4444", "Cancelled"]].map(
                ([color, label]) => (
                  <div key={label} className="text-center">
                    <Skeleton className="h-10 sm:h-12 w-14 mx-auto mb-2" />
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[12px] sm:text-[13px] text-[#6b7280]">{label}</span>
                    </div>
                  </div>
                )
              )
            ) : (
              <>
                <div className="text-center">
                  <div className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-[#10141a] mb-1">{activeCount}</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#22c55e]" />
                    <span className="text-[12px] sm:text-[13px] text-[#6b7280]">Active</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-[#10141a] mb-1">{completedCount}</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00b4b8]" />
                    <span className="text-[12px] sm:text-[13px] text-[#6b7280]">Completed</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-[#10141a] mb-1">{missedCount}</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#f59e0b]" />
                    <span className="text-[12px] sm:text-[13px] text-[#6b7280]">Missed</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-[#10141a] mb-1">{cancelledCount}</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-[12px] sm:text-[13px] text-[#6b7280]">Cancelled</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <MileageFiltersBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        manualFilter={manualFilter}
        onManualFilterChange={(v) => {
          setManualFilter(v);
          setOffset(0);
        }}
        dateRange={dateRange}
        onDateRangeClick={() => setShowDateModal(true)}
        onClearDateRange={() => {
          setDateRange({ startDate: "", endDate: "" });
          setOffset(0);
        }}
      />

      {/* Mileage History */}
      <div className="backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm rounded-[16px] sm:rounded-[20px] lg:rounded-[24px]">
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <div>
            <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
              Mileage History
            </h2>
            <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
              All scheduled, active, and completed mileage
            </p>
          </div>
        </div>

        <div>
          {loading ? (
            <>
              <div className="hidden overflow-hidden border border-[#e5e7eb]/60 bg-white/40 lg:block">
                <div className="overflow-x-auto">
                  <div className={MILEAGE_TABLE_MIN_WIDTH}>
                    <MileageTableHeader />
                    {Array.from({ length: 5 }).map((_, i) => (
                      <MileageRideRowSkeleton key={`desktop-${i}`} variant="desktop" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3 lg:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MileageRideRowSkeleton key={`mobile-${i}`} variant="mobile" />
                ))}
              </div>
            </>
          ) : error ? (
            <div className="py-10 text-center">
              <p className="text-red-600 text-[14px]">{error}</p>
            </div>
          ) : filteredRides.length > 0 ? (
            <>
              <div className="hidden overflow-hidden border border-[#e5e7eb]/60 bg-white/40 lg:block">
                <div className="overflow-x-auto">
                  <div className={MILEAGE_TABLE_MIN_WIDTH}>
                    <MileageTableHeader />
                    {filteredRides.map((entry) => (
                      <MileageRideRow
                        key={entry.id}
                        variant="desktop"
                        entry={entry}
                        onView={() => setViewingRide(entry)}
                        onEdit={() => handleEditRide(entry)}
                        onCancel={
                          entry.status === "scheduled"
                            ? () => handleCancelClick(entry)
                            : undefined
                        }
                        onDelete={() => handleDeleteClick(entry)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3 lg:hidden">
                {filteredRides.map((entry) => (
                  <MileageRideRow
                    key={entry.id}
                    variant="mobile"
                    entry={entry}
                    onView={() => setViewingRide(entry)}
                    onEdit={() => handleEditRide(entry)}
                    onCancel={
                      entry.status === "scheduled"
                        ? () => handleCancelClick(entry)
                        : undefined
                    }
                    onDelete={() => handleDeleteClick(entry)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <Navigation className="w-10 h-10 text-[#d1d5db] mx-auto mb-3" />
              <p className="text-[#9ca3af] text-[14px] font-medium">
                {searchTerm || statusFilter !== "all" || manualFilter !== "all" || dateRange.startDate
                  ? "No rides match your filters"
                  : "No mileage history yet"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalCount > LIMIT && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className="text-[14px] font-medium text-[#10141a]">
                {currentPage}
                <span className="text-[#9ca3af]">/{totalPages}</span>
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setOffset((o) => o - LIMIT)}
                className="p-1.5 rounded-full bg-white/50 backdrop-blur border border-white/30 hover:bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5 text-[#10141a]" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setOffset((o) => o + LIMIT)}
                className="p-1.5 rounded-full bg-white/50 backdrop-blur border border-white/30 hover:bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5 text-[#10141a]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track Mileage Modal */}
      <AddManualMileageModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreated={fetchRides.bind(null, offset)}
      />

      {/* Add / Edit Mileage Modal */}
      <AddMileageModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRide(null);
        }}
        onMileageCreated={handleMileageCreated}
        onMileageUpdated={handleMileageCreated}
        mode={editingRide ? "edit" : "create"}
        initialRide={editingRide}
      />

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={!!rideToDelete}
        onClose={() => !isDeleting && setRideToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete mileage?"
        message="Are you sure you want to delete this mileage record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Ride detail modal */}
      <RideDetailModal
        ride={viewingRide}
        isOpen={!!viewingRide}
        onClose={() => setViewingRide(null)}
        onRideUpdated={(updated) => {
          setViewingRide(updated);
          setRides((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        }}
      />

      {/* Cancel ride confirmation */}
      <DeleteConfirmationModal
        isOpen={!!rideToCancel}
        onClose={() => !isCancelling && setRideToCancel(null)}
        onConfirm={handleCancelConfirm}
        isDeleting={isCancelling}
        title="Cancel ride?"
        message="Are you sure you want to cancel this ride? The ride will be marked as cancelled."
        confirmText="Cancel ride"
        cancelText="Keep"
      />

      {/* Date range filter modal */}
      <BillingDateRangeModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        values={dateRange}
        onChange={setDateRange}
        onApply={(v) => { setDateRange(v); setOffset(0); setShowDateModal(false); }}
        title="Filter by date range"
        description="Show mileage records within a date range"
      />
    </div>
  );
}
