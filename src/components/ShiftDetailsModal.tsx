import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { deleteShift, updateShift, Shift, ShiftStatus, formatShiftLocation } from "@/lib/api/shifts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import TimePicker from "@/components/TimePicker";

type ShiftDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  onSendNotification?: (shift: Shift) => void;
  onMessage?: (shift: Shift) => void;
  onCall?: (shift: Shift) => void;
  onMarkCompleted?: (shift: Shift) => void;
  onDelete?: (shift: Shift) => void;
  onAssignManual?: (shift: Shift) => void;
  onShiftUpdated?: (shift: Shift) => void;
  onShiftDeleted?: (shiftId: string) => void;
};

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getShiftDateLabel = (shift: Shift) => {
  if (!shift.date) return "-";
  try {
    return format(parseISO(shift.date), "d MMMM yyyy");
  } catch {
    return shift.date;
  }
};

/** Safely format clock time for display. Handles string, Date, or Firestore timestamp. Never returns an object. */
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

const parseTimeToParts = (time: string): { hours: number; minutes: number } | null => {
  const match = time.match(/(\d{1,2})[.:](\d{2})[:]?([AaPp][Mm])/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
};

const isShiftMissed = (shift: Shift): boolean => {
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (shift.clockedInAt) return false;
  if (!shift.date) return false;

  const date = parseISO(shift.date);
  let endDateTime: Date;

  if (shift.endTime) {
    const parsedTime = parseTimeToParts(shift.endTime);
    if (parsedTime) {
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parsedTime.hours,
        parsedTime.minutes
      );
    } else {
      // If endTime exists but can't be parsed, use end of day
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59
      );
    }
  } else {
    // If no endTime, use end of day
    endDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59
    );
  }

  return endDateTime.getTime() < Date.now();
};

const getStatusCallout = (shift: Shift) => {
  if (isShiftMissed(shift)) {
    return {
      tone: "missed" as const,
      title: "Missed",
      description: "This shift marked as missed as it doesn't have any clock out time",
    };
  }

  if (shift.status === ShiftStatus.COMPLETED) {
    return {
      tone: "completed" as const,
      title: "Completed",
      description: "This shift marked as completed.",
    };
  }

  return null;
};

export default function ShiftDetailsModal({
  isOpen,
  onClose,
  shift,
  onSendNotification,
  onMessage,
  onCall,
  onMarkCompleted,
  onDelete,
  onAssignManual,
  onShiftUpdated,
  onShiftDeleted,
}: ShiftDetailsModalProps) {
  if (!isOpen || !shift) return null;

  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift>(shift);
  const [commentInput, setCommentInput] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Update currentShift when shift prop changes
  useEffect(() => {
    if (shift) {
      setCurrentShift(shift);
      setCommentInput(shift.comment || "");
    }
  }, [shift]);

  const dspName = currentShift.employee?.fullName || "Unknown DSP";
  const clientName = currentShift.client
    ? `${currentShift.client.firstName || ""} ${currentShift.client.lastName || ""}`.trim() || "Unknown Client"
    : "Unknown Client";

  const callout = getStatusCallout(currentShift);
  const canMarkCompleted = currentShift.status !== ShiftStatus.COMPLETED;

  const handleMarkCompleted = async () => {
    if (!canMarkCompleted || isUpdating) return;
    setIsUpdating(true);
    try {
      const trimmedComment = commentInput.trim();
      const currentComment = (currentShift.comment || "").trim();
      const hasUnsavedComment = trimmedComment && trimmedComment !== currentComment;

      const payload: {
        status: ShiftStatus;
        actionStatus: null;
        completedBy?: string;
        comment?: string;
        commentedBy?: string;
      } = {
        status: ShiftStatus.COMPLETED,
        actionStatus: null,
        completedBy: user?.uid || undefined,
      };
      if (hasUnsavedComment) {
        payload.comment = trimmedComment;
        payload.commentedBy = user?.uid || undefined;
      }

      const response = await updateShift(currentShift.id, payload);
      setCurrentShift(response.shift);
      setCommentInput(response.shift.comment || "");
      onShiftUpdated?.(response.shift);
      onMarkCompleted?.(response.shift);
      toast({
        title: "Shift updated",
        description: "Shift marked as completed.",
      });
    } catch (error) {
      console.error("Failed to mark shift completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark shift as completed.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveComment = async () => {
    if (!commentInput.trim() || isSavingComment) return;
    setIsSavingComment(true);
    try {
      const response = await updateShift(currentShift.id, {
        comment: commentInput.trim(),
        commentedBy: user?.uid || undefined,
      });
      setCurrentShift(response.shift);
      onShiftUpdated?.(response.shift);
      toast({
        title: "Comment saved",
        description: "Shift comment has been updated.",
      });
    } catch (error) {
      console.error("Failed to save comment:", error);
      toast({
        title: "Error",
        description: "Failed to save comment.",
        variant: "destructive",
      });
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteShift(currentShift.id);
      onShiftDeleted?.(currentShift.id);
      onDelete?.(currentShift);
      toast({
        title: "Shift deleted",
        description: "The shift was deleted successfully.",
      });
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete shift:", error);
      toast({
        title: "Error",
        description: "Failed to delete shift.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNotImplemented = (label: string) => {
    toast({
      title: "Coming soon",
      description: `${label} action is not wired yet.`,
    });
  };

  const handleTimeUpdate = async (field: "clockedInAt" | "clockedOutAt", timeValue: string) => {
    if (isSavingTime) return;
    setIsSavingTime(true);
    try {
      // Build an ISO string by combining the shift date with the picked time
      const shiftDate = currentShift.date ? parseISO(currentShift.date) : new Date();
      const [hours, minutes] = timeValue.split(":").map(Number);
      const combined = new Date(Date.UTC(
        shiftDate.getFullYear(),
        shiftDate.getMonth(),
        shiftDate.getDate(),
        hours,
        minutes,
        0,
        0
      ));
      const isoString = combined.toISOString();

      const response = await updateShift(currentShift.id, { [field]: isoString });
      setCurrentShift(response.shift);
      onShiftUpdated?.(response.shift);
      toast({
        title: "Shift updated",
        description: `${field === "clockedInAt" ? "Clock in" : "Clock out"} time saved.`,
      });
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${field === "clockedInAt" ? "clock in" : "clock out"} time.`,
        variant: "destructive",
      });
    } finally {
      setIsSavingTime(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[547px] max-w-[90vw] rounded-[20px] bg-white px-6 pt-6 pb-5 shadow-xl flex flex-col min-h-[553px]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 bg-[#eff2f3] border border-[rgba(255,255,255,0.3)] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer"
          aria-label="Close shift details"
        >
          <X className="w-4 h-4 text-[#10141a]" />
        </button>

        <div className="mb-4">
          <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">Shift</h2>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            {getShiftDateLabel(currentShift)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
              {currentShift.employee?.profilePicture && (
                <AvatarImage
                  src={currentShift.employee.profilePicture}
                  alt={dspName}
                  className="w-full h-full object-cover aspect-auto"
                />
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
              {currentShift.client?.profileImage && (
                <AvatarImage
                  src={currentShift.client.profileImage}
                  alt={clientName}
                  className="w-full h-full object-cover aspect-auto"
                />
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

        <div className="w-full rounded-[8px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.4)] p-3 text-[14px] leading-[1.4] mb-4">
          <div className="flex gap-2">
            <span className="w-[90px] text-[#808081]">Location</span>
            <span className="text-[#10141a] font-semibold">{formatShiftLocation(currentShift.location) || "--------"}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="w-[90px] text-[#808081]">Clock In</span>
            {currentShift.clockedInAt ? (
              <span className="text-[#10141a] font-semibold">{formatClockTime(currentShift.clockedInAt)}</span>
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
            {currentShift.clockedOutAt ? (
              <span className="text-[#10141a] font-semibold">{formatClockTime(currentShift.clockedOutAt)}</span>
            ) : (
              <TimePicker value="" onChange={(val) => handleTimeUpdate("clockedOutAt", val)}>
                <span className="text-[#10141a] font-semibold cursor-pointer hover:text-[#00b4b8] transition-colors">
                  {isSavingTime ? "Saving..." : "--------"}
                </span>
              </TimePicker>
            )}
          </div>
        </div>

        {callout && (
          <div
            className={`mb-4 flex gap-2 rounded-[8px] border border-[rgba(255,255,255,0.3)] p-3 text-[14px] leading-[1.4] ${callout.tone === "completed"
              ? "bg-[rgba(0,216,65,0.08)]"
              : "bg-[rgba(213,52,17,0.08)]"
              }`}
          >
            {callout.tone === "completed" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#0EAF52]" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-[#D53411]" />
            )}
            <div>
              <p className="font-semibold text-[#10141a]">{callout.title}</p>
              <p className="text-[#808081]">{callout.description}</p>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <div className="mb-3">
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full rounded-[8px] border-2 border-[#d1d5db] bg-white p-3 text-[14px] leading-[1.4] text-[#10141a] placeholder:text-[#808081] resize-none focus:outline-none focus:ring-2 focus:ring-[#00b4b8] focus:border-[#00b4b8]"
            />
          </div>
          <div className="flex w-full justify-between gap-2">
            <button
              onClick={() =>
                onSendNotification ? onSendNotification(currentShift) : handleNotImplemented("Send Notification")
              }
              disabled={!onSendNotification}
              className={`h-9 w-[152px] rounded-full text-[14px] font-semibold text-white transition-colors ${onSendNotification
                ? "bg-[#b2b2b3] hover:bg-[#9a9a9b] cursor-pointer active:bg-[#828283]"
                : "bg-[#b2b2b3] opacity-50 cursor-not-allowed"
                }`}
            >
              Send Notification
            </button>
            <button
              onClick={handleSaveComment}
              disabled={!commentInput.trim() || isSavingComment}
              className={`h-9 w-[152px] rounded-full text-[14px] font-semibold text-white transition-colors ${commentInput.trim() && !isSavingComment
                ? "bg-[#3b82f6] hover:bg-[#2563eb] cursor-pointer active:bg-[#1d4ed8]"
                : "bg-[#3b82f6] opacity-50 cursor-not-allowed"
                }`}
            >
              {isSavingComment ? "Saving..." : "Comment"}
            </button>
            <button
              onClick={() => (onCall ? onCall(currentShift) : handleNotImplemented("Call"))}
              disabled={!onCall}
              className={`h-9 w-[152px] rounded-full text-[14px] font-semibold text-white transition-colors ${onCall
                ? "bg-[#b2b2b3] hover:bg-[#9a9a9b] cursor-pointer active:bg-[#828283]"
                : "bg-[#b2b2b3] opacity-50 cursor-not-allowed"
                }`}
            >
              Call
            </button>
          </div>

          <div className="mt-3 flex w-full justify-between gap-2">
            <button
              onClick={handleMarkCompleted}
              disabled={!canMarkCompleted || isUpdating}
              className={`h-9 w-[235px] rounded-full text-[14px] font-semibold text-white transition-colors ${canMarkCompleted && !isUpdating
                ? "bg-[#00b4b8] hover:bg-[#00a0a4] cursor-pointer active:bg-[#008c90]"
                : "bg-[#00b4b8] opacity-50 cursor-not-allowed"
                }`}
            >
              {isUpdating ? "Updating..." : "Mark As Completed"}
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className={`h-9 w-[235px] rounded-full text-[14px] font-semibold text-white transition-colors ${isDeleting
                ? "bg-[#d53411] opacity-50 cursor-not-allowed"
                : "bg-[#d53411] hover:bg-[#c02e0f] cursor-pointer active:bg-[#ab280d]"
                }`}
            >
              Delete Shift
            </button>
          </div>

          <button
            onClick={() =>
              onAssignManual ? onAssignManual(currentShift) : handleNotImplemented("Assign Manual Shift")
            }
            disabled={!onAssignManual}
            className={`mt-3 w-full h-9 rounded-full border text-[14px] font-semibold transition-colors ${onAssignManual
              ? "border-[#525253] text-[#525253] hover:bg-[#f5f5f5] cursor-pointer active:bg-[#ebebeb]"
              : "border-[#b2b2b3] text-[#b2b2b3] opacity-50 cursor-not-allowed"
              }`}
          >
            Assign Manual Shift
          </button>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Shift?"
        message="Are you sure you want to delete this shift? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
