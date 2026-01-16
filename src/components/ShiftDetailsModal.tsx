import React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Shift, ShiftStatus, formatShiftLocation } from "@/lib/api/shifts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const isShiftMissed = (shift: Shift): boolean => {
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (shift.clockedInAt) return false;
  if (!shift.date || !shift.endTime) return false;

  const match = shift.endTime.match(/(\d{1,2})[.:](\d{2})[:]?([AaPp][Mm])/);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const date = parseISO(shift.date);
  const endDateTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  );

  return endDateTime.getTime() < Date.now();
};

const getStatusCallout = (shift: Shift) => {
  const hasClockIn = Boolean(shift.clockedInAt);
  const hasClockOut = Boolean(shift.clockedOutAt);

  if (isShiftMissed(shift)) {
    return {
      tone: "missed" as const,
      title: "Missed",
      description: "This shift marked as missed as it doesn’t have any clock out time",
    };
  }

  if (shift.status === ShiftStatus.COMPLETED && hasClockIn && hasClockOut) {
    return {
      tone: "completed" as const,
      title: "Completed",
      description: "This shift marked as completed.",
    };
  }

  if (!hasClockIn && !hasClockOut) {
    return {
      tone: "incomplete" as const,
      title: "Incomplete",
      description: "This shift marked as incomplete as it doesn’t have any clock in, clock out time",
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
}: ShiftDetailsModalProps) {
  if (!isOpen || !shift) return null;

  const dspName = shift.employee?.fullName || "Unknown DSP";
  const clientName = shift.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown Client"
    : "Unknown Client";

  const callout = getStatusCallout(shift);
  const canMarkCompleted = shift.status !== ShiftStatus.COMPLETED;

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
            {getShiftDateLabel(shift)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
              {shift.employee?.profilePicture && (
                <AvatarImage
                  src={shift.employee.profilePicture}
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
              {shift.client?.profileImage && (
                <AvatarImage
                  src={shift.client.profileImage}
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
            <span className="text-[#10141a] font-semibold">{formatShiftLocation(shift.location) || "--------"}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="w-[90px] text-[#808081]">Clock In</span>
            <span className="text-[#10141a] font-semibold">{shift.clockedInAt || "--------"}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="w-[90px] text-[#808081]">Clock Out</span>
            <span className="text-[#10141a] font-semibold">{shift.clockedOutAt || "--------"}</span>
          </div>
        </div>

        {callout && (
          <div
            className={`mb-4 flex gap-2 rounded-[8px] border border-[rgba(255,255,255,0.3)] p-3 text-[14px] leading-[1.4] ${
              callout.tone === "completed"
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
          <div className="flex w-full justify-between gap-2">
          <button
            onClick={() => shift && onSendNotification?.(shift)}
            className="h-9 w-[152px] rounded-full bg-[#b2b2b3] text-[14px] font-semibold text-white"
          >
            Send Notification
          </button>
          <button
            onClick={() => shift && onMessage?.(shift)}
            className="h-9 w-[152px] rounded-full bg-[#b2b2b3] text-[14px] font-semibold text-white"
          >
            Message
          </button>
          <button
            onClick={() => shift && onCall?.(shift)}
            className="h-9 w-[152px] rounded-full bg-[#b2b2b3] text-[14px] font-semibold text-white"
          >
            Call
          </button>
        </div>

        <div className="mt-3 flex w-full justify-between gap-2">
          <button
            onClick={() => shift && onMarkCompleted?.(shift)}
            disabled={!canMarkCompleted}
            className={`h-9 w-[235px] rounded-full text-[14px] font-semibold text-white ${
              canMarkCompleted ? "bg-[#00b4b8]" : "bg-[#00b4b8] opacity-30 cursor-not-allowed"
            }`}
          >
            Mark As Completed
          </button>
          <button
            onClick={() => shift && onDelete?.(shift)}
            className="h-9 w-[235px] rounded-full bg-[#d53411] text-[14px] font-semibold text-white"
          >
            Delete Shift
          </button>
        </div>

        <button
          onClick={() => shift && onAssignManual?.(shift)}
          className="mt-3 w-full h-9 rounded-full border border-[#525253] text-[#525253] text-[14px] font-semibold"
        >
          Assign Manual Shift
        </button>
        </div>
      </div>
    </div>
  );
}
