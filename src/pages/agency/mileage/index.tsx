import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, ArrowUpRight, Pencil, Trash2, XCircle, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import AddMileageModal from "./components/AddMileageModal";
import RideDetailModal from "./components/RideDetailModal";
import AddManualMileageModal from "../../userPanel/mileage/components/AddManualMileageModal";
import { mileageApi, MileageRide } from "@/lib/api/mileage";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

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

  const fetchRides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mileageApi.listAgency({ limit: 10 });
      setRides(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mileage");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const handleMileageCreated = () => {
    fetchRides();
  };

  const handleEditRide = (ride: MileageRide) => {
    setEditingRide(ride);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (ride: MileageRide) => {
    setRideToDelete(ride);
  };

  const handleDeleteConfirm = async () => {
    if (!rideToDelete) return;
    setIsDeleting(true);
    try {
      await mileageApi.deleteAgency(rideToDelete.id);
      setRideToDelete(null);
      await fetchRides();
    } catch (e) {
      console.error("Failed to delete ride:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelClick = (ride: MileageRide) => {
    setRideToCancel(ride);
  };

  const handleCancelConfirm = async () => {
    if (!rideToCancel) return;
    setIsCancelling(true);
    try {
      await mileageApi.cancelAgency(rideToCancel.id);
      setRideToCancel(null);
      await fetchRides();
    } catch (e) {
      console.error("Failed to cancel ride:", e);
    } finally {
      setIsCancelling(false);
    }
  };

  const activeCount = rides.filter((r) => r.status === "scheduled" || r.status === "in_progress" || r.status === "paused").length;
  const completedCount = rides.filter((r) => r.status === "completed").length;
  const cancelledCount = rides.filter((r) => r.status === "cancelled").length;

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
          {/*<Button*/}
          {/*  onClick={() => setIsManualModalOpen(true)}*/}
          {/*  className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009ba1] text-white rounded-full px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 h-auto text-[13px] sm:text-[14px] lg:text-[15px] font-medium shadow-none"*/}
          {/*>*/}
          {/*  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />*/}
          {/*  Track Mileage*/}
          {/*</Button>*/}
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#00b8d4] hover:bg-[#00a0bd] text-white rounded-full px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 h-auto text-[13px] sm:text-[14px] lg:text-[15px] font-semibold shadow-none"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add Mileage
          </Button>
        </div>
      </div>

      {/* Mileage Overview Section */}
      <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-[16px] sm:rounded-[20px] lg:rounded-[24px] backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-0">
          <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
            Mileage
          </h2>
          <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
            Insightful overview of patient recovery and ongoing care
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 lg:flex lg:justify-end">
          {loading ? (
            [["#22c55e", "Active"], ["#3b82f6", "Completed"], ["#3b82f6", "Missed"], ["#3b82f6", "Cancelled"]].map(([color, label]) => (
              <div key={label} className="text-center p-3 sm:p-0">
                <Skeleton className="h-10 sm:h-12 w-14 mx-auto mb-2" />
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">{label}</span>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="text-center p-3 sm:p-0">
                <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">{activeCount}</div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#22c55e]"></div>
                  <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Active</span>
                </div>
              </div>
              <div className="text-center p-3 sm:p-0">
                <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">{completedCount}</div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3b82f6]"></div>
                  <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Completed</span>
                </div>
              </div>
              <div className="text-center p-3 sm:p-0">
                <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">0</div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3b82f6]"></div>
                  <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Missed</span>
                </div>
              </div>
              <div className="text-center p-3 sm:p-0">
                <div className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold text-[#10141a] mb-1 sm:mb-2">{cancelledCount}</div>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#3b82f6]"></div>
                  <span className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">Cancelled</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mileage History */}
      <div className="backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm rounded-[16px] sm:rounded-[20px] lg:rounded-[24px]">
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] sm:text-[22px] lg:text-[24px] font-bold text-[#10141a] mb-1">
                Mileage history
              </h2>
              <p className="text-[12px] sm:text-[13px] lg:text-[14px] text-[#6b7280]">
                These are your Past Mileage
              </p>
            </div>
            {/* <button className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors cursor-pointer">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button> */}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="divide-y divide-[#e5e7eb]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-6 min-w-[300px]">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-[52.5px] h-[60px] rounded-[8px] shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-[52.5px] h-[60px] rounded-[8px] shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-8" />
                        </div>
                      </div>
                    </div>
                    <div className="grid flex-1 grid-cols-4 gap-6">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="space-y-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
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
            <div className="p-8 sm:p-10 lg:p-12 text-center">
              <p className="text-red-600 text-[14px]">{error}</p>
            </div>
          ) : rides.length > 0 ? (
            <div className="divide-y divide-[#e5e7eb]">
              {rides.map((entry) => {
                const distanceKm = entry.actualDistance ?? null;
                const distanceStr = distanceKm != null ? `${distanceKm} km` : "—";
                const scheduledDate = (() => {
                  const v = entry.scheduledStartTime as unknown;
                  if (!v) return "—";
                  if (typeof v === "string") return new Date(v).toLocaleDateString();
                  if (typeof v === "object" && v !== null) {
                    const s = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
                    if (typeof s === "number") return new Date(s * 1000).toLocaleDateString();
                  }
                  return "—";
                })();
                const statusColors: Record<string, string> = {
                  scheduled: "bg-blue-100 text-blue-700",
                  in_progress: "bg-green-100 text-green-700",
                  paused: "bg-yellow-100 text-yellow-700",
                  completed: "bg-gray-100 text-gray-600",
                  cancelled: "bg-red-100 text-red-600",
                };
                return (
                  <div key={entry.id} className="p-6 hover:bg-[#f9fafb] transition-colors">
                    <div className="flex items-center gap-8">
                      {/* Client & DSP */}
                      <div className="flex items-center gap-6 min-w-[300px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                            {entry.clientAvatarUrl && (
                              <AvatarImage
                                src={entry.clientAvatarUrl}
                                 alt={entry.clientName ?? undefined}
                                className="w-full h-full object-cover aspect-auto rounded-[8px]"
                              />
                            )}
                            <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                              {getInitials(entry.clientName || "Client")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[15px] text-[#10141a]">
                              {entry.clientName || "—"}
                            </div>
                            <div className="text-[13px] text-[#9ca3af]">Client</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                            {entry.caregiverAvatarUrl && (
                              <AvatarImage
                                src={entry.caregiverAvatarUrl}
                                alt={entry.caregiverName}
                                className="w-full h-full object-cover aspect-auto rounded-[8px]"
                              />
                            )}
                            <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                              {getInitials(entry.caregiverName || "DSP")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[15px] text-[#10141a]">
                              {entry.caregiverName || "—"}
                            </div>
                            <div className="text-[13px] text-[#9ca3af]">DSP</div>
                          </div>
                        </div>
                      </div>

                      {/* Info columns */}
                      <div className="grid flex-1 grid-cols-4 gap-6">
                        <div>
                          <div className="text-[13px] text-[#9ca3af] mb-1">Scheduled</div>
                          <div className="text-[15px] text-[#10141a]">{scheduledDate}</div>
                        </div>
                        <div>
                          <div className="text-[13px] text-[#9ca3af] mb-1">Segments</div>
                          <div className="text-[15px] text-[#10141a]">{entry.segmentCount ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-[13px] text-[#9ca3af] mb-1">Distance</div>
                          <div className="text-[15px] text-[#10141a]">{distanceStr}</div>
                        </div>
                        <div>
                          <div className="text-[13px] text-[#9ca3af] mb-1">Status</div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium capitalize ${statusColors[entry.status] ?? ""}`}>
                            {entry.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
            <div className="p-8 sm:p-10 lg:p-12 text-center">
              <p className="text-[#9ca3af] text-[13px] sm:text-[14px] lg:text-[15px]">No mileage history yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Track Mileage Modal */}
      <AddManualMileageModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreated={fetchRides}
      />

      {/* Add Mileage Modal */}
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
