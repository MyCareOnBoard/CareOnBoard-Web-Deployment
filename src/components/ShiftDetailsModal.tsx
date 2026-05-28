import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  updateShift,
  getShiftById,
  Shift,
  ShiftStatus,
  formatShiftLocation,
  type AnomalyCode,
} from "@/lib/api/shifts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import TimePicker from "@/components/TimePicker";
import { ANOMALY_LABELS } from "@/pages/shared/shift-maintenance/audit-display";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import VoiceInputButton from "@/components/VoiceInputButton";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";

const REASON_MAX = 500;

type ShiftDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  /** Shown as badges; missed callout copy prefers anomaly list when this includes `missed`. */
  anomalyCodes?: AnomalyCode[];
  /** When true, load full shift (client/employee) via `getShiftById` using `agencyId`. */
  hydrateFromServer?: boolean;
  agencyId?: string;
  onShiftUpdated?: (shift: Shift) => void;
  /** e.g. shift maintenance: refresh list after a successful save. */
  onMaintenanceComplete?: () => void;
};

const getInitialsFromName = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getShiftDateLabel = (s: { date?: string }) => {
  if (!s.date) return "-";
  try {
    return format(parseISO(s.date), "d MMMM yyyy");
  } catch {
    return s.date;
  }
};

function parseClockToDate(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    if (typeof seconds === "number") {
      const ns = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number;
      const ms = seconds * 1000 + (typeof ns === "number" ? ns / 1_000_000 : 0);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** Match legacy save: UTC time-of-day from stored clock matches draft HH:mm from TimePicker. */
function clockedAtToHHmm(value: unknown): string {
  const d = parseClockToDate(value);
  if (!d) return "";
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToIso(hhmm: string, shiftDateStr: string | undefined): string | null {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hStr, mStr] = hhmm.split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const shiftDate = shiftDateStr ? parseISO(shiftDateStr) : new Date();
  return new Date(
    Date.UTC(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), hours, minutes, 0, 0)
  ).toISOString();
}

/** 12h label for a draft HH:mm (matches TimePicker display, no timezone shift). */
function formatDraftHHmmLabel(hhmm: string): string {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "--------";
  const hour24 = parseInt(m[1], 10);
  const min = m[2];
  const displayHour = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const displayPeriod = hour24 >= 12 ? "PM" : "AM";
  return `${String(displayHour).padStart(2, "0")}:${min} ${displayPeriod}`;
}

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

const isShiftMissed = (s: Shift): boolean => {
  if (s.status === ShiftStatus.COMPLETED) return false;
  if (s.clockedInAt) return false;
  if (!s.date) return false;
  const date = parseISO(s.date);
  let endDateTime: Date;
  if (s.endTime) {
    const parsedTime = parseTimeToParts(s.endTime);
    if (parsedTime) {
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parsedTime.hours,
        parsedTime.minutes
      );
    } else {
      endDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    }
  } else {
    endDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  }
  return endDateTime.getTime() < Date.now();
};

function getStatusCallout(s: Shift, codes: AnomalyCode[]) {
  if (codes.includes("missed")) {
    return {
      tone: "missed" as const,
      title: "Missed",
      description: "This shift was missed — no one clocked in before the scheduled time passed.",
    };
  }
  if (isShiftMissed(s)) {
    return {
      tone: "missed" as const,
      title: "Missed",
      description: "This shift was missed — no one clocked in before the scheduled time passed.",
    };
  }
  if (s.status === ShiftStatus.COMPLETED) {
    return {
      tone: "completed" as const,
      title: "Completed",
      description: "This shift was marked as completed.",
    };
  }
  return null;
}

export default function ShiftDetailsModal({
  isOpen,
  onClose,
  shift,
  anomalyCodes = [],
  hydrateFromServer = false,
  agencyId,
  onShiftUpdated,
  onMaintenanceComplete,
}: ShiftDetailsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [fetchedShift, setFetchedShift] = useState<Shift | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const [draftClockIn, setDraftClockIn] = useState("");
  const [draftClockOut, setDraftClockOut] = useState("");
  const [draftResolveLateClockIn, setDraftResolveLateClockIn] = useState(false);
  const [draftCompleted, setDraftCompleted] = useState(false);
  const [draftApprovedForClaim, setDraftApprovedForClaim] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shiftRef = useRef(shift);
  shiftRef.current = shift;

  const shiftResetKey = shift
    ? `${shift.id}|${String(shift.clockedInAt)}|${String(shift.clockedOutAt)}|${shift.status}|${String(shift.approvedForClaim)}`
    : "";

  const resolvedShift = useMemo(() => {
    if (!shift) return null;
    return fetchedShift ?? shift;
  }, [shift, fetchedShift]);

  const resetDraftsFromShift = useCallback((s: Shift) => {
    setDraftClockIn(clockedAtToHHmm(s.clockedInAt));
    setDraftClockOut(clockedAtToHHmm(s.clockedOutAt));
    setDraftResolveLateClockIn(false);
    setDraftCompleted(s.status === ShiftStatus.COMPLETED);
    setDraftApprovedForClaim(Boolean(s.approvedForClaim));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const s = shiftRef.current;
    if (!s) return;

    let cancelled = false;
    setFetchedShift(null);
    setReason("");

    if (hydrateFromServer && agencyId) {
      setLoadingFull(true);
      getShiftById(s.id, { agencyId, client: true, employee: true })
        .then((res) => {
          if (!cancelled) {
            setFetchedShift(res.shift);
            resetDraftsFromShift(res.shift);
          }
        })
        .catch(() => {
          if (!cancelled) {
            toast({
              title: "Couldn't load shift details",
              description: "We loaded the basics. Some fields may be empty.",
              variant: "destructive",
            });
            resetDraftsFromShift(s);
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingFull(false);
        });
    } else {
      setLoadingFull(false);
      resetDraftsFromShift(s);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, shiftResetKey, hydrateFromServer, agencyId, toast, resetDraftsFromShift]);

  if (!isOpen || !shift) return null;

  const dspName =
    resolvedShift?.employee?.fullName ||
    resolvedShift?.assignedDsp ||
    "Unknown DSP";
  const clientExtra = resolvedShift
    ? (resolvedShift as unknown as { clientName?: string | null; clientId?: string | null })
    : null;
  const clientName = resolvedShift?.client
    ? `${resolvedShift.client.firstName || ""} ${resolvedShift.client.lastName || ""}`.trim() || "Unknown Client"
    : clientExtra?.clientName || clientExtra?.clientId || "Unknown Client";

  const callout = resolvedShift ? getStatusCallout(resolvedShift, anomalyCodes) : null;
  const showResolveLateClockIn =
    Boolean(resolvedShift?.estimatedEndTime) || anomalyCodes.includes("late_clock_in");
  const showApproveForBilling = resolvedShift?.status === ShiftStatus.COMPLETED;

  const handleUpdateChanges = async () => {
    if (!resolvedShift || !reason.trim()) {
      toast({
        title: "Add a short note",
        description: "Explain why you're saving these changes so others can follow the activity history.",
        variant: "destructive",
      });
      return;
    }

    const maintenanceReason = reason.trim();
    const serverIn = clockedAtToHHmm(resolvedShift.clockedInAt);
    const serverOut = clockedAtToHHmm(resolvedShift.clockedOutAt);
    const inNorm = draftClockIn.trim();
    const outNorm = draftClockOut.trim();
    const serverCompleted = resolvedShift.status === ShiftStatus.COMPLETED;
    const serverApprovedForClaim = Boolean(resolvedShift.approvedForClaim);

    const payload: Parameters<typeof updateShift>[1] = {
      maintenanceReason,
    };

    if (inNorm !== serverIn) {
      const iso = hhmmToIso(inNorm, resolvedShift.date);
      if (iso) payload.clockedInAt = iso;
    }
    if (outNorm !== serverOut) {
      const iso = hhmmToIso(outNorm, resolvedShift.date);
      if (iso) payload.clockedOutAt = iso;
    }

    if (draftCompleted !== serverCompleted) {
      if (draftCompleted) {
        payload.status = ShiftStatus.COMPLETED;
        payload.actionStatus = null;
        payload.completedBy = user?.uid ?? undefined;
      } else {
        // Backend may reject; if so, constrain UI later.
        payload.status = ShiftStatus.AVAILABLE;
        payload.actionStatus = null;
      }
    }

    const shouldResolveLateClockIn = draftResolveLateClockIn && Boolean(resolvedShift.estimatedEndTime);
    if (shouldResolveLateClockIn) {
      payload.estimatedEndTime = null;
    }

    if (draftApprovedForClaim !== serverApprovedForClaim) {
      payload.approvedForClaim = draftApprovedForClaim;
    }

    const hasMeaningfulChange =
      inNorm !== serverIn ||
      outNorm !== serverOut ||
      draftCompleted !== serverCompleted ||
      shouldResolveLateClockIn ||
      draftApprovedForClaim !== serverApprovedForClaim;
    if (!hasMeaningfulChange && Object.keys(payload).length === 1) {
      toast({
        title: "Nothing to update",
        description: "Change clock times, completion status, billing approval, or late clock-in resolution—or close.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateShift(resolvedShift.id, payload);
      if (hydrateFromServer) setFetchedShift(response.shift);
      resetDraftsFromShift(response.shift);
      setReason("");
      onShiftUpdated?.(response.shift);
      onMaintenanceComplete?.();
      toast({
        title: "Changes saved",
        description: "The shift was updated.",
      });
    } catch (e) {
      if (typeof e === "object" && e !== null && "response" in e && typeof e.response === "object" && e.response !== null && "data" in e.response) {
        const errorData = e.response.data as { code?: string; error?: string };
        toast({
          title: errorData.code || "Error",
          description: errorData.error || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  const showBody = !hydrateFromServer || !loadingFull;
  const canSubmit = Boolean(reason.trim()) && !isSubmitting && resolvedShift;

  return (
    <VoiceRecordingProvider pageTitle="Shift details">
      <VoiceInputButton className="z-[60]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex min-h-[553px] w-[547px] max-w-[90vw] flex-col rounded-[20px] bg-white px-6 pt-6 pb-5 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer rounded-full border border-[rgba(255,255,255,0.3)] bg-[#eff2f3] p-2 transition-colors hover:bg-gray-200"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-[#10141a]" />
        </button>

        <div className="mb-4">
          <h2 className="text-[20px] leading-[1.6] font-medium text-[#10141a]">Update this shift</h2>
          <p className="text-[14px] leading-[1.4] font-medium text-[#808081]">
            {resolvedShift ? getShiftDateLabel(resolvedShift) : getShiftDateLabel(shift)}
          </p>
        </div>

        {loadingFull && hydrateFromServer ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#00b4b8]" aria-label="Loading shift" />
          </div>
        ) : null}

        {showBody && resolvedShift ? (
          <>
            {anomalyCodes.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {anomalyCodes.map((code) => {
                  const meta = ANOMALY_LABELS[code];
                  return (
                    <span
                      key={code}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta?.color || "border-gray-200 bg-gray-100 text-gray-600"}`}
                    >
                      {meta?.label || code}
                    </span>
                  );
                })}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-[60px] w-[52.5px] shrink-0 rounded-[8px]">
                  {resolvedShift.employee?.profilePicture && (
                    <AvatarImage
                      src={resolvedShift.employee.profilePicture}
                      alt={dspName}
                      className="aspect-auto h-full w-full object-cover"
                    />
                  )}
                  <AvatarFallback className="h-full w-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-sm font-medium text-white">
                    {getInitialsFromName(dspName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[16px] leading-[1.6] font-semibold text-black">{dspName}</span>
                  <span className="text-[14px] leading-[1.4] font-medium text-[#808081]">DSP</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-[60px] w-[52.5px] shrink-0 rounded-[8px]">
                  {resolvedShift.client?.profileImage && (
                    <AvatarImage
                      src={resolvedShift.client.profileImage}
                      alt={clientName}
                      className="aspect-auto h-full w-full object-cover"
                    />
                  )}
                  <AvatarFallback className="h-full w-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-sm font-medium text-white">
                    {getInitialsFromName(clientName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[16px] leading-[1.6] font-semibold text-black">{clientName}</span>
                  <span className="text-[14px] leading-[1.4] font-medium text-[#808081]">Client</span>
                </div>
              </div>
            </div>

            <div className="mb-4 w-full rounded-[8px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.4)] p-3 text-[14px] leading-[1.4]">
              <div className="flex gap-2">
                <span className="w-[90px] text-[#808081]">Location</span>
                <span className="font-semibold text-[#10141a]">
                  {formatShiftLocation(resolvedShift.location) || "--------"}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <span className="w-[90px] text-[#808081]">Clock In</span>
                <TimePicker value={draftClockIn} onChange={setDraftClockIn}>
                  <span className="cursor-pointer font-semibold text-[#10141a] transition-colors hover:text-[#00b4b8]">
                    {draftClockIn ? formatDraftHHmmLabel(draftClockIn) : "--------"}
                  </span>
                </TimePicker>
              </div>
              <div className="mt-2 flex gap-2">
                <span className="w-[90px] text-[#808081]">Clock Out</span>
                <TimePicker value={draftClockOut} onChange={setDraftClockOut}>
                  <span className="cursor-pointer font-semibold text-[#10141a] transition-colors hover:text-[#00b4b8]">
                    {draftClockOut ? formatDraftHHmmLabel(draftClockOut) : "--------"}
                  </span>
                </TimePicker>
              </div>
              {showResolveLateClockIn ? (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.06)] pt-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#10141a]">Resolve late clock-in</p>
                    <p className="text-[11px] text-[#808081]">
                      Clears the estimated end time and removes the Late clock-in flag when you save.
                    </p>
                  </div>
                  <Switch
                    checked={draftResolveLateClockIn}
                    onCheckedChange={setDraftResolveLateClockIn}
                    aria-label="Resolve late clock-in"
                  />
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.06)] pt-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#10141a]">Mark shift as completed</p>
                  <p className="text-[11px] text-[#808081]">Applies when you tap Update changes.</p>
                </div>
                <Switch
                  checked={draftCompleted}
                  onCheckedChange={setDraftCompleted}
                  aria-label="Mark shift as completed"
                />
              </div>
              {showApproveForBilling ? (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.06)] pt-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#10141a]">Approve for billing</p>
                    <p className="text-[11px] text-[#808081]">
                      Shows as Approved in Billing &amp; Approvals when you save.
                    </p>
                  </div>
                  <Switch
                    checked={draftApprovedForClaim}
                    onCheckedChange={setDraftApprovedForClaim}
                    aria-label="Approve for billing"
                  />
                </div>
              ) : null}
            </div>

            {callout ? (
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
            ) : null}

            <div className="mt-auto">
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[12px] font-medium text-[#808081]" htmlFor="shift-update-reason">
                    Note for activity history (required)
                  </label>
                  <span
                    className={`text-[12px] ${reason.length > REASON_MAX ? "text-red-500" : "text-[#808081]"}`}
                  >
                    {reason.length}/{REASON_MAX}
                  </span>
                </div>
                <VoiceEnabledTextarea
                  id="shift-update-reason"
                  rows={3}
                  value={reason}
                  onChange={(v) => setReason(v.slice(0, REASON_MAX))}
                  onVoiceAccepted={(t) =>
                    setReason((prev) => {
                      const next = prev.trim() ? `${prev.trim()} ${t.trim()}` : t.trim();
                      return next.slice(0, REASON_MAX);
                    })
                  }
                  placeholder="Example: Correcting clock-in time; client canceled; duplicate entry."
                  className="min-h-[5.25rem] w-full resize-none rounded-[8px] border-2 border-[#d1d5db] bg-white p-3 text-[14px] leading-[1.4] text-[#10141a] placeholder:text-[#808081] shadow-none focus-visible:border-[#00b4b8] focus-visible:ring-2 focus-visible:ring-[#00b4b8]/30 focus-visible:outline-none"
                  fieldName="Shift update note"
                  pageTitle="Shift details"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-[11px] text-[#808081]">
                  Others with access can read this note. Keep it factual and brief.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUpdateChanges}
                disabled={!canSubmit}
                className={`h-11 w-full rounded-full text-[14px] font-semibold text-white transition-colors ${
                  canSubmit
                    ? "cursor-pointer bg-[#00b4b8] hover:bg-[#00a0a4] active:bg-[#008c90]"
                    : "cursor-not-allowed bg-[#00b4b8] opacity-50"
                }`}
              >
                {isSubmitting ? "Saving…" : "Update changes"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
    </VoiceRecordingProvider>
  );
}
