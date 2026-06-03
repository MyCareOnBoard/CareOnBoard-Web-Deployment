import { useEffect, useState } from "react";
import { X, MapPin, Clock, Navigation } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { mileageApi, MileageRide, MileageSegment } from "@/lib/api/mileage";
import { formatRideServiceLabel } from "@/pages/agency/mileage/utils/transportationClientService";

interface RideDetailModalProps {
  ride: MileageRide | null;
  isOpen: boolean;
  onClose: () => void;
  onRideUpdated?: (ride: MileageRide) => void;
}

type FirebaseTimestampLike = { seconds?: number; _seconds?: number };

function parseTs(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null) {
    const s =
      (value as FirebaseTimestampLike).seconds ??
      (value as FirebaseTimestampLike)._seconds;
    if (typeof s === "number") return new Date(s * 1000);
  }
  return null;
}

function fmt(value: unknown, fallback = "—"): string {
  const d = parseTs(value);
  if (!d) return fallback;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(value: unknown): string {
  const d = parseTs(value);
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function duration(start: unknown, end: unknown): string {
  const s = parseTs(start);
  const e = parseTs(end);
  if (!s || !e) return "—";
  const diffMs = e.getTime() - s.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const getInitials = (name?: string | null) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function RideDetailModal({ ride, isOpen, onClose, onRideUpdated }: RideDetailModalProps) {
  const { toast } = useToast();
  const [segments, setSegments] = useState<MileageSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approvalSaving, setApprovalSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !ride) return;
    setApproved(Boolean(ride.approved));
    setSegments([]);
    setLoading(true);
    mileageApi
      .getAgencySegments(ride.id)
      .then((res) => setSegments(res.data ?? []))
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [isOpen, ride?.id, ride?.approved]);

  if (!isOpen || !ride) return null;

  const displayName = ride.clientName ?? ride.purpose ?? "Manual Trip";
  const showApproveForBilling = ride.status === "completed" && Boolean(ride.serviceCode);
  const billingLocked = Boolean(ride.claimId || ride.payrollInvoiceId);

  const handleApprovalToggle = async (next: boolean) => {
    if (billingLocked) {
      toast({
        title: next ? "Cannot approve" : "Cannot unapprove",
        description: ride.claimId
          ? "This ride is on a billing claim and can't be unapproved here."
          : "This ride is on a payroll invoice and can't be unapproved here.",
        variant: "destructive",
      });
      return;
    }

    setApprovalSaving(true);
    const previous = approved;
    setApproved(next);
    try {
      await mileageApi.updateAgency(ride.id, { approved: next });
      onRideUpdated?.({ ...ride, approved: next });
      toast({
        title: next ? "Ride approved for billing." : "Ride removed from billing approval.",
        variant: "success",
      });
    } catch {
      setApproved(previous);
      toast({
        title: "Couldn't update billing approval. Try again.",
        variant: "destructive",
      });
    } finally {
      setApprovalSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Side panel */}
      <div className="relative bg-white h-full w-full max-w-[520px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0] shrink-0">
          <h2 className="text-[18px] font-semibold text-[#10141a]">Mileage Details</h2>
          <button
            onClick={onClose}
            className="bg-[#eff2f3] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* People */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 rounded-xl">
                {ride.clientAvatarUrl && (
                  <img src={ride.clientAvatarUrl} alt={displayName} className="w-full h-full object-cover rounded-xl" />
                )}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                  {getInitials(ride.clientName ?? ride.purpose)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[14px] font-semibold text-[#10141a]">{displayName}</p>
                <p className="text-[12px] text-[#9ca3af]">{ride.clientId ? "Client" : "Purpose"}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-[#e5e7eb]" />

            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 rounded-xl">
                {ride.caregiverAvatarUrl && (
                  <img src={ride.caregiverAvatarUrl} alt={ride.caregiverName} className="w-full h-full object-cover rounded-xl" />
                )}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#6366f1] to-[#4f46e5] text-white text-sm font-medium">
                  {getInitials(ride.caregiverName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-[14px] font-semibold text-[#10141a]">{ride.caregiverName || "—"}</p>
                <p className="text-[12px] text-[#9ca3af]">DSP</p>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f8f9fa] rounded-xl p-4">
              <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium capitalize ${statusStyles[ride.status] ?? ""}`}>
                {ride.status.replace("_", " ")}
              </span>
            </div>
            <div className="bg-[#f8f9fa] rounded-xl p-4">
              <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Total Distance</p>
              <p className="text-[16px] font-bold text-[#10141a]">
                {ride.actualDistance != null ? `${ride.actualDistance} km` : "—"}
              </p>
            </div>
            <div className="bg-[#f8f9fa] rounded-xl p-4">
              <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Scheduled</p>
              <p className="text-[13px] font-medium text-[#10141a]">{fmt(ride.scheduledStartTime)}</p>
            </div>
            <div className="bg-[#f8f9fa] rounded-xl p-4">
              <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Segments</p>
              <p className="text-[16px] font-bold text-[#10141a]">{ride.segmentCount ?? segments.length}</p>
            </div>
            {ride.startedAt && (
              <div className="bg-[#f8f9fa] rounded-xl p-4">
                <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Started At</p>
                <p className="text-[13px] font-medium text-[#10141a]">{fmt(ride.startedAt)}</p>
              </div>
            )}
            {ride.completedAt && (
              <div className="bg-[#f8f9fa] rounded-xl p-4">
                <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Completed At</p>
                <p className="text-[13px] font-medium text-[#10141a]">{fmt(ride.completedAt)}</p>
              </div>
            )}
          </div>

          {(ride.serviceCode || ride.claimId || ride.payrollInvoiceId) && (
            <div className="bg-[#f8f9fa] rounded-xl p-4 space-y-2">
              {ride.serviceCode && (
                <div className="flex justify-between gap-2 text-[13px]">
                  <span className="text-[#9ca3af]">Service</span>
                  <span className="font-medium text-[#10141a]">{formatRideServiceLabel(ride)}</span>
                </div>
              )}
              {ride.serviceAuthStartDate && (
                <div className="flex justify-between gap-2 text-[13px]">
                  <span className="text-[#9ca3af]">Authorization</span>
                  <span className="text-[#10141a]">
                    {ride.serviceAuthStartDate}
                    {ride.serviceAuthEndDate ? ` – ${ride.serviceAuthEndDate}` : ""}
                  </span>
                </div>
              )}
              {ride.claimId && (
                <p className="text-[12px] text-[#6b7280]">On claim {ride.claimId}</p>
              )}
              {ride.payrollInvoiceId && (
                <p className="text-[12px] text-[#6b7280]">On payroll invoice {ride.payrollInvoiceId}</p>
              )}
            </div>
          )}

          {showApproveForBilling && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#10141a]">Approve for billing</p>
                <p className="text-[11px] text-[#808081]">
                  Included in Billing &amp; Approvals when turned on.
                </p>
              </div>
              <Switch
                checked={approved}
                disabled={approvalSaving || billingLocked}
                onCheckedChange={handleApprovalToggle}
                aria-label="Approve for billing"
              />
            </div>
          )}

          {/* Notes */}
          {ride.notes && (
            <div className="bg-[#f8f9fa] rounded-xl p-4">
              <p className="text-[11px] text-[#9ca3af] mb-1 uppercase tracking-wide">Notes</p>
              <p className="text-[13px] text-[#10141a]">{ride.notes}</p>
            </div>
          )}

          {/* Segments */}
          <div>
            <h3 className="text-[15px] font-semibold text-[#10141a] mb-3">Trip Segments</h3>

            {loading ? (
              <p className="text-[13px] text-[#9ca3af] text-center py-4">Loading segments…</p>
            ) : segments.length === 0 ? (
              <div className="bg-[#f8f9fa] rounded-xl p-6 text-center">
                <Navigation className="w-8 h-8 text-[#d1d5db] mx-auto mb-2" />
                <p className="text-[13px] text-[#9ca3af]">No segments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((seg, i) => {
                  const isActive = seg.endLocation === null;
                  return (
                    <div key={seg.id} className="bg-[#f8f9fa] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${isActive ? "bg-[#22c55e]" : "bg-[#00b4b8]"}`}>
                            {i + 1}
                          </div>
                          <span className="text-[13px] font-medium text-[#10141a]">
                            Segment {i + 1}
                          </span>
                        </div>
                        {isActive ? (
                          <span className="text-[11px] font-medium text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-[13px] font-bold text-[#10141a]">
                            {seg.distance != null ? `${seg.distance} km` : "—"}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Clock className="w-3 h-3 text-[#9ca3af]" />
                            <p className="text-[10px] text-[#9ca3af]">Started</p>
                          </div>
                          <p className="text-[12px] font-medium text-[#10141a]">{fmtTime(seg.startedAt)}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Clock className="w-3 h-3 text-[#9ca3af]" />
                            <p className="text-[10px] text-[#9ca3af]">Stopped</p>
                          </div>
                          <p className="text-[12px] font-medium text-[#10141a]">
                            {isActive ? <span className="text-[#22c55e]">Ongoing</span> : fmtTime(seg.stoppedAt)}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <MapPin className="w-3 h-3 text-[#9ca3af]" />
                            <p className="text-[10px] text-[#9ca3af]">Duration</p>
                          </div>
                          <p className="text-[12px] font-medium text-[#10141a]">
                            {isActive ? "—" : duration(seg.startedAt, seg.stoppedAt)}
                          </p>
                        </div>
                      </div>

                      {/* GPS coords (Google Maps links) */}
                      {seg.startLocation && (
                        <div className="mt-3 pt-3 border-t border-[#e5e7eb]">
                          {seg.endLocation ? (
                            <a
                              href={`https://www.google.com/maps/dir/${seg.startLocation.latitude},${seg.startLocation.longitude}/${seg.endLocation.latitude},${seg.endLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-[#00b4b8] hover:underline"
                            >
                              <MapPin className="w-3 h-3" />
                              View route on Maps
                            </a>
                          ) : (
                            <a
                              href={`https://www.google.com/maps?q=${seg.startLocation.latitude},${seg.startLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-[#00b4b8] hover:underline"
                            >
                              <MapPin className="w-3 h-3" />
                              View start on Maps
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Total row */}
                {segments.length > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-[#00b4b8]/5 border border-[#00b4b8]/20 rounded-xl">
                    <span className="text-[13px] font-semibold text-[#10141a]">Total distance</span>
                    <span className="text-[15px] font-bold text-[#00b4b8]">
                      {ride.actualDistance != null ? `${ride.actualDistance} km` : "—"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cancellation info */}
          {ride.status === "cancelled" && ride.cancelReason && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-[11px] text-red-400 mb-1 uppercase tracking-wide">Cancellation reason</p>
              <p className="text-[13px] text-red-700">{ride.cancelReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}