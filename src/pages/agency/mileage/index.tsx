import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Pencil,
  Trash2,
  XCircle,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Navigation,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import AddMileageModal from "./components/AddMileageModal";
import RideDetailModal from "./components/RideDetailModal";
import AddManualMileageModal from "../../userPanel/mileage/components/AddManualMileageModal";
import { mileageApi, MileageRide } from "@/lib/api/mileage";

const LIMIT = 10;

type StatusFilter = "all" | "active" | "missed" | "completed" | "cancelled";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

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

  const fetchRides = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mileageApi.listAgency({ limit: LIMIT, offset: currentOffset });
      setRides(res.data ?? []);
      setTotalCount(res.pagination?.count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mileage");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides(offset);
  }, [fetchRides, offset]);

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
  const totalDistanceKm = rides
    .filter((r) => r.status === "completed" && r.actualDistance != null)
    .reduce((sum, r) => sum + (r.actualDistance ?? 0), 0);

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
          r.caregiverName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rides, statusFilter, searchTerm]);

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-600",
  };

  const filterPills: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Missed", value: "missed" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

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
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-6">
            {loading ? (
              [["#22c55e", "Active"], ["#00b4b8", "Completed"], ["#f59e0b", "Missed"], ["#ef4444", "Cancelled"], ["#9ca3af", "Total km"]].map(
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
                <div className="text-center">
                  <div className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-[#10141a] mb-1">
                    {totalDistanceKm % 1 === 0 ? totalDistanceKm : totalDistanceKm.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#9ca3af]" />
                    <span className="text-[12px] sm:text-[13px] text-[#6b7280]">Total km</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-5">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search client or DSP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#e5e5e6] bg-white text-[13px] text-[#10141a] placeholder:text-[#9ca3af] outline-none focus:ring-1 focus:ring-[#00b4b8] focus:border-[#00b4b8] transition-colors"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterPills.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setStatusFilter(pill.value)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors border ${
                statusFilter === pill.value
                  ? "bg-[#00b4b8] text-white border-[#00b4b8]"
                  : "bg-white text-[#10141a] border-[#e5e5e6] hover:border-[#00b4b8]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

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

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[20px] bg-[rgba(255,255,255,0.4)] border border-white shadow-sm p-4 sm:p-5"
                >
                  <div className="flex items-center gap-6">
                    {/* Avatars */}
                    <div className="flex items-center gap-4 min-w-[260px]">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="w-[52px] h-[60px] rounded-[8px] shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-24" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="w-[52px] h-[60px] rounded-[8px] shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-24" />
                          <Skeleton className="h-3 w-8" />
                        </div>
                      </div>
                    </div>
                    {/* Info cols */}
                    <div className="grid flex-1 grid-cols-4 gap-4">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="space-y-1.5">
                          <Skeleton className="h-3 w-14" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                    {/* Action stubs */}
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 3 }).map((_, k) => (
                        <Skeleton key={k} className="w-8 h-8 rounded-lg" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <p className="text-red-600 text-[14px]">{error}</p>
            </div>
          ) : filteredRides.length > 0 ? (
            <div className="space-y-3">
              {filteredRides.map((entry) => {
                const distanceKm = entry.actualDistance ?? null;
                const distanceStr = distanceKm != null ? `${distanceKm} km` : "—";

                const scheduledDateObj = parseScheduledDate(entry.scheduledStartTime);
                const scheduledDate = scheduledDateObj
                  ? scheduledDateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                const scheduledTime = scheduledDateObj
                  ? scheduledDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "";

                return (
                  <div
                    key={entry.id}
                    className="rounded-[20px] bg-[rgba(255,255,255,0.4)] backdrop-blur-[50px] border border-white shadow-sm p-4 sm:p-5 hover:bg-[rgba(255,255,255,0.65)] transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      {/* Client/Purpose & DSP */}
                      <div className="flex items-center gap-3 w-[280px] shrink-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="w-[44px] h-[52px] rounded-[8px] shrink-0">
                            {entry.clientId && entry.clientAvatarUrl && (
                              <AvatarImage
                                src={entry.clientAvatarUrl}
                                alt={entry.clientName ?? undefined}
                                className="w-full h-full object-cover aspect-auto rounded-[8px]"
                              />
                            )}
                            <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium flex items-center justify-center">
                              {entry.clientId
                                ? getInitials(entry.clientName || "Client")
                                : <Navigation className="w-3.5 h-3.5" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-[#10141a] truncate">
                              {entry.clientId
                                ? (entry.clientName || "—")
                                : (entry.purpose || "Manual mileage")}
                            </div>
                            <div className="text-[11px] text-[#9ca3af]">
                              {entry.clientId ? "Client" : "Purpose"}
                            </div>
                          </div>
                        </div>
                        <div className="w-px h-8 bg-[#e5e7eb] shrink-0" />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="w-[44px] h-[52px] rounded-[8px] shrink-0">
                            {entry.caregiverAvatarUrl && (
                              <AvatarImage
                                src={entry.caregiverAvatarUrl}
                                alt={entry.caregiverName}
                                className="w-full h-full object-cover aspect-auto rounded-[8px]"
                              />
                            )}
                            <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white text-sm font-medium">
                              {getInitials(entry.caregiverName || "DSP")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-[#10141a] truncate">
                              {entry.caregiverName || "—"}
                            </div>
                            <div className="text-[11px] text-[#9ca3af]">DSP</div>
                          </div>
                        </div>
                      </div>

                      {/* Info columns */}
                      <div className="grid flex-1 grid-cols-4 gap-4">
                        <div>
                          <div className="text-[12px] text-[#9ca3af] mb-1">Scheduled</div>
                          <div className="text-[14px] text-[#10141a] font-medium">{scheduledDate}</div>
                          {scheduledTime && (
                            <div className="text-[12px] text-[#6b7280]">{scheduledTime}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[12px] text-[#9ca3af] mb-1">Segments</div>
                          <div className="text-[14px] text-[#10141a] font-medium">{entry.segmentCount ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-[12px] text-[#9ca3af] mb-1">Distance</div>
                          <div className="text-[14px] text-[#10141a] font-medium">{distanceStr}</div>
                        </div>
                        <div>
                          <div className="text-[12px] text-[#9ca3af] mb-1">Status</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${statusColors[entry.status] ?? ""}`}
                            >
                              {entry.status.replace("_", " ")}
                            </span>
                            {!entry.clientId && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f4f6] text-[#6b7280]">
                                Manual
                              </span>
                            )}
                            {entry.isRecurring && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f4f6] text-[#6b7280]">
                                <RefreshCw className="w-2.5 h-2.5" />
                                Recurring
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingRide(entry)}
                          className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                          aria-label="View details"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-[#6b7280]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditRide(entry)}
                          className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                          aria-label="Edit mileage"
                          title="Edit mileage"
                        >
                          <Pencil className="w-4 h-4 text-[#10141a]" />
                        </button>
                        {entry.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => handleCancelClick(entry)}
                            className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                            aria-label="Cancel ride"
                            title="Cancel ride"
                          >
                            <XCircle className="w-4 h-4 text-amber-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(entry)}
                          className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                          aria-label="Delete mileage"
                          title="Delete mileage"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Navigation className="w-10 h-10 text-[#d1d5db] mx-auto mb-3" />
              <p className="text-[#9ca3af] text-[14px] font-medium">
                {searchTerm || statusFilter !== "all"
                  ? "No rides match your search or filter"
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
    </div>
  );
}
