import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ShiftsMonthCalendar } from "@/components/shifts/ShiftsMonthCalendar";
import { cn } from "@/lib/utils";
import { listShifts, type Shift, formatShiftLocation } from "@/lib/api/shifts";
import { generatePath, useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { DspShiftScheduleListRow } from "@/pages/agency/dsp-management/components/DspShiftScheduleListRow";
import {
  getInitialsFromShiftPersonName,
  getShiftRowStatusInfo,
} from "@/lib/shift-row-status";
import { formatShiftRowClockDisplay } from "@/lib/shift-row-time";

export function ActivityTab({
  clientName,
  clientId,
  agencyId,
  currentPage,
  setCurrentPage,
  itemsPerPage,
}: {
  clientName: string;
  clientId: string;
  agencyId: string;
  currentPage: number;
  setCurrentPage: (next: number) => void;
  itemsPerPage: number;
}) {
  const [shiftsView, setShiftsView] = useState<"calendar" | "list">("calendar");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shiftMenuOpenForId, setShiftMenuOpenForId] = useState<string | null>(null);
  const listFetchedRef = useRef(false);
  const navigate = useNavigate();

  // Lazy-fetch list shifts when user opens List view
  useEffect(() => {
    if (shiftsView !== "list" || !clientId || !agencyId) return;
    if (listFetchedRef.current) return;

    const fetchShifts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await listShifts({
          agencyId,
          clientId,
          client: true,
          employee: true,
          limit: 100,
        });
        setShifts(response.shifts || []);
        listFetchedRef.current = true;
      } catch (err: unknown) {
        console.error("Failed to fetch shifts:", err);
        const message = err instanceof Error ? err.message : "Failed to load shifts";
        setError(message);
        setShifts([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchShifts();
  }, [shiftsView, clientId, agencyId]);

  // Format date from ISO string or Firestore Timestamp
  const formatDate = useCallback((dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!dateValue) return "N/A";
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp object
      if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle ISO string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      else {
        return "N/A";
      }
      
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      
      return format(date, "d MMMM");
    } catch {
      return "N/A";
    }
  }, []);

  // Calculate duration between two timestamps
  const calculateDuration = useCallback((start?: string | { _seconds?: number; _nanoseconds?: number } | Date, end?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!start || !end) return "N/A";
    
    try {
      let startDate: Date;
      let endDate: Date;
      
      // Parse start time
      if (typeof start === 'object' && '_seconds' in start && start._seconds) {
        startDate = new Date(start._seconds * 1000);
      } else if (start instanceof Date) {
        startDate = start;
      } else if (typeof start === 'string') {
        startDate = new Date(start);
      } else {
        return "N/A";
      }
      
      // Parse end time
      if (typeof end === 'object' && '_seconds' in end && end._seconds) {
        endDate = new Date(end._seconds * 1000);
      } else if (end instanceof Date) {
        endDate = end;
      } else if (typeof end === 'string') {
        endDate = new Date(end);
      } else {
        return "N/A";
      }
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return "N/A";
      }
      
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return diffMinutes > 0 ? `${diffHours}h ${diffMinutes}m` : `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      } else {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      }
    } catch {
      return "N/A";
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage));

  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return shifts.slice(start, start + itemsPerPage);
  }, [shifts, currentPage, itemsPerPage]);

  const shiftsViewToggle = (opts?: { dividerAfterYear?: boolean }) => (
    <div
      className={cn(
        "flex items-center gap-1",
        opts?.dividerAfterYear && "ml-0.5 border-l border-gray-200/80 pl-2",
      )}
      role="tablist"
      aria-label="Shifts view"
    >
      <Button
        type="button"
        variant={shiftsView === "calendar" ? "default" : "outline"}
        size="icon-sm"
        className="rounded-[5px] px-0"
        aria-pressed={shiftsView === "calendar"}
        aria-label="Calendar view"
        onClick={() => setShiftsView("calendar")}
      >
        <CalendarDays className="size-5 shrink-0" />
      </Button>
      <Button
        type="button"
        variant={shiftsView === "list" ? "default" : "outline"}
        size="icon-sm"
        className="rounded-[5px] px-0"
        aria-pressed={shiftsView === "list"}
        aria-label="List view"
        onClick={() => setShiftsView("list")}
      >
        <List className="size-5 shrink-0" />
      </Button>
    </div>
  );

  return (
    <>
      {shiftsView === "calendar" && (
        <div className="mt-4">
          <ShiftsMonthCalendar
            variant="client"
            agencyId={agencyId}
            clientId={clientId}
            headerActions={shiftsViewToggle({ dividerAfterYear: true })}
          />
        </div>
      )}

      {shiftsView === "list" && (
      <div className="mt-4 space-y-4">
      <div className="flex justify-end">{shiftsViewToggle()}</div>
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
            <p className="text-[14px] font-medium text-[#808081]">
              Loading shifts…
            </p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[14px] font-medium text-red-600">
              {error}
            </p>
          </div>
        ) : paginatedShifts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14px] font-medium text-[#808081]">
              No shifts to show in this list yet.
            </p>
          </div>
        ) : (
          paginatedShifts.map((shift) => {
            const dspName = shift.employee?.fullName || shift.assignedDsp || "Unassigned";
            const resolvedClientName = shift.client
              ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || clientName
              : clientName;
            const durationLabel =
              shift.sessionDuration ||
              (shift.clockedInAt && shift.clockedOutAt
                ? calculateDuration(shift.clockedInAt, shift.clockedOutAt)
                : null);

            return (
              <DspShiftScheduleListRow
                key={shift.id}
                clientName={resolvedClientName}
                clientImageUrl={shift.client?.profileImage}
                clientInitials={getInitialsFromShiftPersonName(resolvedClientName)}
                dspName={dspName}
                dspImageUrl={shift.employee?.profilePicture}
                dspInitials={getInitialsFromShiftPersonName(dspName)}
                dateLabel={formatDate(shift.date)}
                locationAddress={formatShiftLocation(shift.location) || "Location not specified"}
                durationLabel={durationLabel}
                statusInfo={getShiftRowStatusInfo(shift, shift.approved)}
                clockedInDisplay={formatShiftRowClockDisplay(shift.clockedInAt)}
                clockedOutDisplay={formatShiftRowClockDisplay(shift.clockedOutAt)}
                menuOpen={shiftMenuOpenForId === shift.id}
                onMenuOpenChange={(open) => setShiftMenuOpenForId(open ? shift.id : null)}
                onDetails={() => {
                  setShiftMenuOpenForId(null);
                  navigate(generatePath(Routes.agency.shiftDetails, { shiftId: shift.id }));
                }}
              />
            );
          })
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
          {Math.min(currentPage, totalPages)}
          <span className="text-[14px] text-[#808081]">/{totalPages}</span>
        </span>
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5 text-[#10141a]" />
        </button>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5 text-[#10141a]" />
        </button>
      </div>
      </div>
      )}
    </>
  );
}


