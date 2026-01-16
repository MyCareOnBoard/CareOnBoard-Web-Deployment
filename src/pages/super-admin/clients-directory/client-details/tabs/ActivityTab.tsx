import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { listShifts, type Shift, formatShiftLocation } from "@/lib/api/shifts";

type ShiftRow = {
  id: string;
  dspName: string;
  dspRole: string;
  avatarUrl?: string;
  dateLabel: string;
  location: string;
  clockedIn: string;
  clockedOut: string;
  durationLabel: string;
};

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
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch shifts for this client
  useEffect(() => {
    const fetchShifts = async () => {
      if (!clientId || !agencyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await listShifts({
          agencyId,
          clientId,
          client: true, // Populate client data
          employee: true, // Populate employee/DSP data
          limit: 100, // Get all shifts for client-side pagination
        });
        setShifts(response.shifts || []);
      } catch (err: any) {
        console.error("Failed to fetch shifts:", err);
        setError(err.message || "Failed to load shifts");
        setShifts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();
  }, [clientId, agencyId]);

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

  // Format time from ISO string or Firestore Timestamp
  const formatTime = useCallback((timeValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!timeValue) return "N/A";
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp object
      if (typeof timeValue === 'object' && '_seconds' in timeValue && timeValue._seconds) {
        date = new Date(timeValue._seconds * 1000);
      }
      // Handle Date object
      else if (timeValue instanceof Date) {
        date = timeValue;
      }
      // Handle ISO string
      else if (typeof timeValue === 'string') {
        date = new Date(timeValue);
      }
      else {
        return "N/A";
      }
      
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      
      return format(date, "h:mm a");
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

  // Transform API shifts to display format
  const shiftRows: ShiftRow[] = useMemo(() => {
    return shifts.map((shift) => {
      const dspName = shift.employee?.fullName || shift.assignedDsp || "Unassigned";
      const dspRole = "DSP"; // Employee doesn't have a role field, defaulting to DSP
      const dateLabel = formatDate(shift.date);
      const location = formatShiftLocation(shift.location) || "Location not specified";
      const clockedIn = shift.clockedInAt ? formatTime(shift.clockedInAt) : "Not clocked in";
      const clockedOut = shift.clockedOutAt ? formatTime(shift.clockedOutAt) : shift.status === "ongoing" ? "In progress" : "Not clocked out";
      const durationLabel = shift.sessionDuration || (shift.clockedInAt && shift.clockedOutAt ? calculateDuration(shift.clockedInAt, shift.clockedOutAt) : "N/A");
      
      return {
        id: shift.id,
        dspName,
        dspRole,
        avatarUrl: shift.employee?.profilePicture,
        dateLabel,
        location,
        clockedIn,
        clockedOut,
        durationLabel,
      };
    });
  }, [shifts, formatDate, formatTime, calculateDuration]);

  const totalPages = Math.max(1, Math.ceil(shiftRows.length / itemsPerPage));

  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return shiftRows.slice(start, start + itemsPerPage);
  }, [shiftRows, currentPage, itemsPerPage]);

  return (
    <>
      {/* Shifts Header */}
      <div className="mt-8">
        <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
          Shifts
        </p>
        <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
          Shifts for {clientName}
        </p>
      </div>

      {/* Shift Rows */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
            <p className="text-[14px] font-medium text-[#808081]">
              Loading shifts...
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
              No shifts found for this client.
            </p>
          </div>
        ) : (
          paginatedShifts.map((shift) => (
          <div
            key={shift.id}
            className="flex items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
          >
            <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
              {shift.avatarUrl && (
                <AvatarImage
                  src={shift.avatarUrl}
                  alt={shift.dspName}
                  className="w-full h-full object-cover aspect-auto rounded-[8px]"
                />
              )}
              <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                {shift.dspName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("")}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-1 items-center gap-16 min-w-0">
              <div className="flex flex-col gap-1 min-w-[160px]">
                <p className="text-[16px] font-semibold leading-[1.6] text-black truncate">
                  {shift.dspName}
                </p>
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                  {shift.dspRole}
                </p>
              </div>

              <div className="w-[75px] text-[14px] font-medium leading-[1.4]">
                <p className="mb-0 text-[#808081]">Date</p>
                <p className="text-[#10141a]">{shift.dateLabel}</p>
              </div>

              <div className="w-[180px] text-[14px] font-medium leading-[1.4]">
                <p className="mb-0 text-[#808081]">Location</p>
                <p className="text-[#10141a]">{formatShiftLocation(shift.location)}</p>
              </div>

              <p className="w-[95px] text-[14px] font-medium leading-[1.4] text-[#808081]">
                Clocked In <span className="text-[#10141a]">{shift.clockedIn}</span>
              </p>

              <p className="w-[105px] text-[14px] font-medium leading-[1.4] text-[#808081]">
                Clocked Out{" "}
                <span className="text-[#10141a]">{shift.clockedOut}</span>
              </p>
            </div>

            <div className="bg-[rgba(178,178,179,0.1)] border-[#b2b2b3] border-[0.5px] border-solid rounded-[60px] px-[10px] py-[10px] flex items-center justify-center">
              <span className="text-[12px] font-semibold leading-[normal] text-[#565656] whitespace-nowrap">
                {shift.durationLabel}
              </span>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-2">
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
    </>
  );
}


