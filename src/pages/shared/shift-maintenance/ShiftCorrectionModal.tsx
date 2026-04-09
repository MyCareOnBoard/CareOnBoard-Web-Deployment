import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import TimePicker from "@/components/TimePicker";
import {
  updateShift,
  deleteShift,
  getShiftById,
  formatShiftLocation,
  type ShiftAnomaly,
  type Shift,
  ShiftStatus,
} from "@/lib/api/shifts";

interface ShiftCorrectionModalProps {
  shift: ShiftAnomaly;
  agencyId: string;
  onClose: () => void;
  onComplete: () => void;
}

const REASON_MAX = 500;

const ANOMALY_BADGES: Record<string, { label: string; color: string }> = {
  missed: { label: "Missed shift", color: "bg-red-100 text-red-700 border-red-200" },
  incomplete_clock: { label: "No clock-out", color: "bg-amber-100 text-amber-700 border-amber-200" },
  unassigned: { label: "No DSP assigned", color: "bg-blue-100 text-blue-700 border-blue-200" },
  invalid_time: { label: "End before start", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const formatClockTime = (value: unknown): string => {
  if (value == null) return "--------";
  if (typeof value === "string") {
    if (value.includes("AM") || value.includes("PM")) return value;
    try {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "--------" : format(d, "h:mm a");
    } catch {
      return "--------";
    }
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "--------" : format(value, "h:mm a");
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    if (typeof seconds === "number") {
      const ns = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number;
      const ms = seconds * 1000 + (typeof ns === "number" ? ns / 1_000_000 : 0);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? "--------" : format(d, "h:mm a");
    }
  }
  return "--------";
};

const getShiftDateLabel = (s: { date?: string }) => {
  if (!s.date) return "-";
  try {
    return format(parseISO(s.date), "d MMMM yyyy");
  } catch {
    return s.date;
  }
};

export default function ShiftCorrectionModal({
  shift,
  agencyId,
  onClose,
  onComplete,
}: ShiftCorrectionModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [fullShift, setFullShift] = useState<Shift | null>(null);
  const [loadingFull, setLoadingFull] = useState(true);

  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingFull(true);
    getShiftById(shift.id, { agencyId, client: true, employee: true })
      .then((res) => {
        if (!cancelled) setFullShift(res.shift);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load shift details",
            description: "We loaded the basics. Some fields may be empty.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFull(false);
      });
    return () => { cancelled = true; };
  }, [shift.id, agencyId, toast]);

  const current = fullShift ?? ({
    id: shift.id,
    date: shift.date,
    startTime: shift.startTime || undefined,
    endTime: shift.endTime || undefined,
    status: shift.status,
    employeeId: shift.employeeId,
    clientId: shift.clientId,
  } as Partial<Shift> as Shift);

  const dspName = current.employee?.fullName || shift.assignedDsp || "Unknown DSP";
  const clientName = current.client
    ? `${current.client.firstName || ""} ${current.client.lastName || ""}`.trim() || "Unknown Client"
    : shift.clientId || "Unknown Client";

  const handleTimeUpdate = async (field: "clockedInAt" | "clockedOutAt", timeValue: string) => {
    if (isSavingTime) return;
    setIsSavingTime(true);
    try {
      const shiftDate = current.date ? parseISO(current.date) : new Date();
      const [hours, minutes] = timeValue.split(":").map(Number);
      const combined = new Date(Date.UTC(
        shiftDate.getFullYear(),
        shiftDate.getMonth(),
        shiftDate.getDate(),
        hours, minutes, 0, 0,
      ));
      const response = await updateShift(current.id, {
        [field]: combined.toISOString(),
        maintenanceReason: `Set ${field === "clockedInAt" ? "clock-in" : "clock-out"} time`,
      });
      setFullShift(response.shift);
      toast({
        title: "Time saved",
        description: `${field === "clockedInAt" ? "Clock-in" : "Clock-out"} time updated.`,
      });
    } catch {
      toast({
        title: "Couldn't save time",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTime(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await updateShift(current.id, {
        status: ShiftStatus.COMPLETED,
        actionStatus: null,
        completedBy: user?.uid || undefined,
        maintenanceReason: reason.trim() || "Marked as completed via maintenance",
      });
      setFullShift(response.shift);
      toast({ title: "Shift completed", description: "Shift marked as completed." });
      onComplete();
    } catch {
      toast({
        title: "Something went wrong",
        description: "We couldn't update the shift.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    if (!reason.trim()) {
      toast({
        title: "Add a short explanation",
        description: "A note is required before you can remove this shift.",
        variant: "destructive",
      });
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteShift(current.id);
      toast({ title: "Shift removed", description: "This action is saved in the activity history." });
      setShowDeleteConfirm(false);
      onComplete();
    } catch {
      toast({
        title: "Something went wrong",
        description: "We couldn't remove the shift.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const canMarkCompleted = current.status !== ShiftStatus.COMPLETED;

  const statusCallout = (() => {
    if (shift.anomalyCodes.includes("missed")) {
      return { tone: "missed" as const, title: "Missed", description: "This shift was missed — no one clocked in before the scheduled time passed." };
    }
    if (current.status === ShiftStatus.COMPLETED) {
      return { tone: "completed" as const, title: "Completed", description: "This shift was marked as completed." };
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[547px] max-w-[90vw] rounded-[20px] bg-white px-6 pt-6 pb-5 shadow-xl flex flex-col min-h-[553px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 bg-[#eff2f3] border border-[rgba(255,255,255,0.3)] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-[#10141a]" />
        </button>

        {/* Title & date */}
        <div className="mb-4">
          <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">Shift</h2>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            {getShiftDateLabel(current)}
          </p>
        </div>

        {loadingFull ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#00b4b8]" />
          </div>
        ) : (
          <>
            {/* Anomaly badges */}
            {shift.anomalyCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {shift.anomalyCodes.map((code) => {
                  const meta = ANOMALY_BADGES[code];
                  return (
                    <span key={code} className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${meta?.color || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {meta?.label || code}
                    </span>
                  );
                })}
              </div>
            )}

            {/* DSP + Client avatars */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                  {current.employee?.profilePicture && (
                    <AvatarImage src={current.employee.profilePicture} alt={dspName} className="w-full h-full object-cover aspect-auto" />
                  )}
                  <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                    {getInitialsFromName(dspName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[16px] font-semibold leading-[1.6] text-black">{dspName}</span>
                  <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">DSP</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                  {current.client?.profileImage && (
                    <AvatarImage src={current.client.profileImage} alt={clientName} className="w-full h-full object-cover aspect-auto" />
                  )}
                  <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                    {getInitialsFromName(clientName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[16px] font-semibold leading-[1.6] text-black">{clientName}</span>
                  <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">Client</span>
                </div>
              </div>
            </div>

            {/* Location / Clock-in / Clock-out */}
            <div className="w-full rounded-[8px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.4)] p-3 text-[14px] leading-[1.4] mb-4">
              <div className="flex gap-2">
                <span className="w-[90px] text-[#808081]">Location</span>
                <span className="text-[#10141a] font-semibold">{formatShiftLocation(current.location) || "--------"}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="w-[90px] text-[#808081]">Clock In</span>
                {current.clockedInAt ? (
                  <span className="text-[#10141a] font-semibold">{formatClockTime(current.clockedInAt)}</span>
                ) : (
                  <TimePicker value="" onChange={(val) => handleTimeUpdate("clockedInAt", val)}>
                    <span className="text-[#10141a] font-semibold cursor-pointer hover:text-[#00b4b8] transition-colors">
                      {isSavingTime ? "Saving..." : "--------"}
                    </span>
                  </TimePicker>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <span className="w-[90px] text-[#808081]">Clock Out</span>
                {current.clockedOutAt ? (
                  <span className="text-[#10141a] font-semibold">{formatClockTime(current.clockedOutAt)}</span>
                ) : (
                  <TimePicker value="" onChange={(val) => handleTimeUpdate("clockedOutAt", val)}>
                    <span className="text-[#10141a] font-semibold cursor-pointer hover:text-[#00b4b8] transition-colors">
                      {isSavingTime ? "Saving..." : "--------"}
                    </span>
                  </TimePicker>
                )}
              </div>
            </div>

            {/* Status callout */}
            {statusCallout && (
              <div
                className={`mb-4 flex gap-2 rounded-[8px] border border-[rgba(255,255,255,0.3)] p-3 text-[14px] leading-[1.4] ${
                  statusCallout.tone === "completed" ? "bg-[rgba(0,216,65,0.08)]" : "bg-[rgba(213,52,17,0.08)]"
                }`}
              >
                {statusCallout.tone === "completed" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#0EAF52]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-[#D53411]" />
                )}
                <div>
                  <p className="font-semibold text-[#10141a]">{statusCallout.title}</p>
                  <p className="text-[#808081]">{statusCallout.description}</p>
                </div>
              </div>
            )}

            {/* Reason / note — maintenance-specific */}
            <div className="mt-auto">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-medium text-[#808081]" htmlFor="shift-correction-reason">
                    Note for activity history (required)
                  </label>
                  <span className={`text-[12px] ${reason.length > REASON_MAX ? "text-red-500" : "text-[#808081]"}`}>
                    {reason.length}/{REASON_MAX}
                  </span>
                </div>
                <textarea
                  id="shift-correction-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
                  rows={3}
                  placeholder="Example: Client canceled; DSP called out sick; fixing a duplicate entry."
                  className="w-full rounded-[8px] border-2 border-[#d1d5db] bg-white p-3 text-[14px] leading-[1.4] text-[#10141a] placeholder:text-[#808081] resize-none focus:outline-none focus:ring-2 focus:ring-[#00b4b8] focus:border-[#00b4b8]"
                />
                <p className="mt-1 text-[11px] text-[#808081]">Others with access can read this note. Keep it factual and brief.</p>
              </div>

              {/* Action buttons — same layout as ShiftDetailsModal */}
              <div className="flex w-full justify-between gap-2">
                <button
                  type="button"
                  onClick={handleMarkCompleted}
                  disabled={!canMarkCompleted || isSaving || !reason.trim()}
                  className={`h-9 w-[235px] rounded-full text-[14px] font-semibold text-white transition-colors ${
                    canMarkCompleted && !isSaving && reason.trim()
                      ? "bg-[#00b4b8] hover:bg-[#00a0a4] cursor-pointer active:bg-[#008c90]"
                      : "bg-[#00b4b8] opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isSaving ? "Updating..." : "Mark As Completed"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`h-9 w-[235px] rounded-full text-[14px] font-semibold text-white transition-colors ${
                    isDeleting
                      ? "bg-[#d53411] opacity-50 cursor-not-allowed"
                      : "bg-[#d53411] hover:bg-[#c02e0f] cursor-pointer active:bg-[#ab280d]"
                  }`}
                >
                  Delete Shift
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Shift?"
        message="Are you sure you want to delete this shift? This action cannot be undone. A snapshot will be saved in the activity history."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
