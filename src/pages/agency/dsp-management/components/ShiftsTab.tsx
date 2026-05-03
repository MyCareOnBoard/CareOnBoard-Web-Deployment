import { useState, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { type Shift, categorizeShifts, formatShiftLocation } from "@/lib/api/shifts";

interface ShiftsTabProps {
  shifts: Shift[];
  isLoading: boolean;
  getInitials: (name: string) => string;
}

function getClientName(shift: Shift): string {
  if (!shift.client) return "Unknown Client";
  const c = shift.client as any;
  if (c.name) return c.name;
  const first = c.firstName || "";
  const last = c.lastName || "";
  return `${first} ${last}`.trim() || "Unknown Client";
}

function getClientAvatar(shift: Shift): string | undefined {
  if (!shift.client) return undefined;
  const c = shift.client as any;
  return c.avatar ?? c.profileImage;
}

/** Format a date string to "12 January" style */
function formatShiftDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  } catch {
    return dateStr;
  }
}

/** Format a timestamp to "2.30 PM" style */
function formatTime(timeStr?: string | null | { _seconds: number; _nanoseconds: number }): string {
  if (!timeStr) return "-";
  if (typeof timeStr === "object" && "_seconds" in timeStr) {
    const d = new Date(timeStr._seconds * 1000);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":", ".");
  }
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) {
      return timeStr;
    }
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":", ".");
  } catch {
    return timeStr;
  }
}

/** Compute a human-readable session duration from startTime/endTime or sessionDuration */
function getSessionDuration(shift: Shift): string {
  if (shift.sessionDuration) return shift.sessionDuration;
  if (shift.startTime && shift.endTime) {
    try {
      const base = new Date(shift.date);
      const parseTime = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        const d = new Date(base);
        d.setHours(h, m, 0, 0);
        return d;
      };
      const start = parseTime(shift.startTime);
      const end = parseTime(shift.endTime);
      const diffMins = (end.getTime() - start.getTime()) / 60000;
      if (diffMins <= 0) return "";
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (mins === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
      return `${hours}h ${mins}m`;
    } catch {
      return "";
    }
  }
  return "";
}

export function ShiftsTab({ shifts, isLoading, getInitials }: ShiftsTabProps) {
  const [shiftsTab, setShiftsTab] = useState<"previous" | "ongoing" | "upcoming">("previous");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const categorized = useMemo(() => categorizeShifts(shifts), [shifts]);

  const filteredShifts = useMemo(() => {
    switch (shiftsTab) {
      case "previous": return categorized.previous;
      case "ongoing":  return categorized.current ? [categorized.current] : [];
      case "upcoming": return categorized.upcoming;
      default: return [];
    }
  }, [shiftsTab, categorized]);

  const handleTabChange = (tab: "previous" | "ongoing" | "upcoming") => {
    setShiftsTab(tab);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));
  const paginatedShifts = filteredShifts.slice((page - 1) * pageSize, page * pageSize);

  const tabClass = (tab: "previous" | "ongoing" | "upcoming") =>
    `px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer border ${
      shiftsTab === tab
        ? "bg-teal-500 text-white border-teal-500"
        : "text-gray-600 border-gray-200 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
    }`;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2">
        <button onClick={() => handleTabChange("previous")} className={tabClass("previous")}>
          Previous Shifts
          {categorized.previous.length > 0 && (
            <span className="ml-1.5 text-xs opacity-80">({categorized.previous.length})</span>
          )}
        </button>
        <button onClick={() => handleTabChange("ongoing")} className={tabClass("ongoing")}>
          Ongoing Shifts
          {categorized.current && <span className="ml-1.5 text-xs opacity-80">(1)</span>}
        </button>
        <button onClick={() => handleTabChange("upcoming")} className={tabClass("upcoming")}>
          Upcoming Shifts
          {categorized.upcoming.length > 0 && (
            <span className="ml-1.5 text-xs opacity-80">({categorized.upcoming.length})</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-gray-500">No {shiftsTab} shifts available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* ── PREVIOUS SHIFTS ── */}
          {shiftsTab === "previous" && paginatedShifts.map((shift) => {
            const clientName = getClientName(shift);
            const duration = getSessionDuration(shift);
            const isIncomplete = shift.status === "expired" || shift.status === "pending";
            return (
              <div key={shift.id} className="flex items-center justify-between py-4 px-5 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={getClientAvatar(shift)} alt={clientName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{clientName}</p>
                    <p className="text-xs text-gray-400">Client</p>
                  </div>
                </div>
                {/* Date */}
                <div className="min-w-[90px]">
                  <p className="text-[11px] text-gray-400 mb-0.5">Date</p>
                  <p className="text-sm text-gray-800 font-medium">{formatShiftDate(shift.date)}</p>
                </div>
                {/* Location */}
                <div className="min-w-[140px]">
                  <p className="text-[11px] text-gray-400 mb-0.5">Location</p>
                  <p className="text-sm text-gray-800 font-medium">{formatShiftLocation(shift.location) || "-"}</p>
                </div>
                {/* Clocked In */}
                <div className="min-w-20">
                  <p className="text-[11px] text-gray-400 mb-0.5">Clocked In</p>
                  <p className="text-sm text-gray-800 font-medium">{formatTime(shift.clockedInAt)}</p>
                </div>
                {/* Clocked Out */}
                <div className="min-w-20">
                  <p className="text-[11px] text-gray-400 mb-0.5">Clocked Out</p>
                  <p className="text-sm text-gray-800 font-medium">{formatTime(shift.clockedOutAt)}</p>
                </div>
                {/* Status badge */}
                <div className="flex justify-end min-w-[140px]">
                  {isIncomplete ? (
                    <span className="px-4 py-1.5 rounded-full text-xs font-medium border border-red-300 text-red-500 bg-white">
                      Incomplete
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {duration ? `${duration} session` : "Completed"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── ONGOING SHIFTS ── */}
          {shiftsTab === "ongoing" && paginatedShifts.map((shift) => {
            const clientName = getClientName(shift);
            return (
              <div key={shift.id} className="flex items-center justify-between py-4 px-5 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                {/* Avatar + Name + Active badge */}
                <div className="flex items-center gap-3 min-w-[220px]">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={getClientAvatar(shift)} alt={clientName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{clientName}</p>
                      <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full border border-green-400 text-green-600 bg-white">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Client</p>
                  </div>
                </div>
                {/* Clock In */}
                <div className="min-w-20">
                  <p className="text-[11px] text-gray-400 mb-0.5">Clock In</p>
                  <p className="text-sm text-gray-800 font-medium">{formatTime(shift.clockedInAt) !== "-" ? formatTime(shift.clockedInAt) : shift.startTime}</p>
                </div>
                {/* Clock Out */}
                <div className="min-w-20">
                  <p className="text-[11px] text-gray-400 mb-0.5">Clock Out</p>
                  <p className="text-sm text-gray-800 font-medium">{shift.endTime ?? "-"}</p>
                </div>
                {/* Details button */}
                <div className="flex justify-end min-w-[100px]">
                  <button className="px-5 py-1.5 rounded-full text-sm font-medium bg-gray-200 text-gray-600 hover:bg-teal-500 hover:text-white transition-colors cursor-pointer">
                    Details
                  </button>
                </div>
              </div>
            );
          })}

          {/* ── UPCOMING SHIFTS ── */}
          {shiftsTab === "upcoming" && paginatedShifts.map((shift) => {
            const clientName = getClientName(shift);
            const duration = getSessionDuration(shift);
            return (
              <div key={shift.id} className="flex items-center justify-between py-4 px-5 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={getClientAvatar(shift)} alt={clientName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{clientName}</p>
                    <p className="text-xs text-gray-400">Client</p>
                  </div>
                </div>
                {/* Location */}
                <div className="min-w-[140px]">
                  <p className="text-[11px] text-gray-400 mb-0.5">Location</p>
                  <p className="text-sm text-gray-800 font-medium">{formatShiftLocation(shift.location) || "-"}</p>
                </div>
                {/* Duration pill */}
                <div className="min-w-[90px]">
                  {duration && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-medium border border-teal-400 text-teal-600 bg-white">
                      {duration}
                    </span>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-2 justify-end">
                  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-gray-200 text-gray-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-gray-200 transition-colors cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer">
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredShifts.length > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
