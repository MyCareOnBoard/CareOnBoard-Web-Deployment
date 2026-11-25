import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { AgencyPagination } from "@/components/agency/AgencyListKit";
import { format } from "date-fns";
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

export type ActivityTabProps = {
  clientName: string;
  clientId: string;
  agencyId: string;
  currentPage: number;
  setCurrentPage: (next: number) => void;
  itemsPerPage: number;
  /** Path template for shift details navigation. Omit to hide the details action. */
  shiftDetailsRoute?: string;
};

export function ActivityTab({
  clientName,
  clientId,
  agencyId,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  shiftDetailsRoute = Routes.agency.shiftDetails,
}: ActivityTabProps) {
  const [shiftsView, setShiftsView] = useState<"calendar" | "list">("calendar");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shiftMenuOpenForId, setShiftMenuOpenForId] = useState<string | null>(null);
  const listFetchedRef = useRef(false);
  const navigate = useNavigate();

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

  const formatDate = useCallback((dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!dateValue) return "N/A";

    try {
      let date: Date;

      if (typeof dateValue === "object" && "_seconds" in dateValue && dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === "string") {
        date = new Date(dateValue);
      } else {
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

  const calculateDuration = useCallback(
    (
      start?: string | { _seconds?: number; _nanoseconds?: number } | Date,
      end?: string | { _seconds?: number; _nanoseconds?: number } | Date,
    ): string => {
      if (!start || !end) return "N/A";

      try {
        let startDate: Date;
        let endDate: Date;

        if (typeof start === "object" && "_seconds" in start && start._seconds) {
          startDate = new Date(start._seconds * 1000);
        } else if (start instanceof Date) {
          startDate = start;
        } else if (typeof start === "string") {
          startDate = new Date(start);
        } else {
          return "N/A";
        }

        if (typeof end === "object" && "_seconds" in end && end._seconds) {
          endDate = new Date(end._seconds * 1000);
        } else if (end instanceof Date) {
          endDate = end;
        } else if (typeof end === "string") {
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
          return diffMinutes > 0
            ? `${diffHours}h ${diffMinutes}m`
            : `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
        }
        return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
      } catch {
        return "N/A";
      }
    },
    [],
  );

  const totalPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage));

  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return shifts.slice(start, start + itemsPerPage);
  }, [shifts, currentPage, itemsPerPage]);

  const viewButton = (on: boolean) => cn(
    "grid h-8 w-8 cursor-pointer place-items-center rounded-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
    on ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white" : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
  );

  const shiftsViewToggle = (opts?: { dividerAfterYear?: boolean }) => (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-[10px] bg-[#f4f5f6] p-1 dark:bg-white/5",
        opts?.dividerAfterYear && "ml-0.5",
      )}
      role="tablist"
      aria-label="Shifts view"
    >
      <button
        type="button"
        className={viewButton(shiftsView === "calendar")}
        aria-pressed={shiftsView === "calendar"}
        aria-label="Calendar view"
        onClick={() => setShiftsView("calendar")}
      >
        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
      </button>
      <button
        type="button"
        className={viewButton(shiftsView === "list")}
        aria-pressed={shiftsView === "list"}
        aria-label="List view"
        onClick={() => setShiftsView("list")}
      >
        <List aria-hidden="true" className="size-4 shrink-0" />
      </button>
    </div>
  );

  return (
    <>
      {shiftsView === "calendar" && (
        <div className="mt-5 rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b] p-5">
          <ShiftsMonthCalendar
            variant="client"
            agencyId={agencyId}
            clientId={clientId}
            headerActions={shiftsViewToggle({ dividerAfterYear: true })}
          />
        </div>
      )}

      {shiftsView === "list" && (
        <div className="mt-5 space-y-4">
          <div className="flex justify-end">{shiftsViewToggle()}</div>
          <div className="overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
          <div className="space-y-3 p-4">
            {isLoading ? (
              <div role="status" className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div aria-hidden="true" className="w-full space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-[88px] animate-pulse rounded-[12px] bg-[#f4f5f6] dark:bg-white/5" />)}
                </div>
                <p className="sr-only">Loading shifts…</p>
              </div>
            ) : error ? (
              <div role="alert" className="py-12 text-center">
                <p className="text-[14px] text-[#b42318] dark:text-[#f8a1a1]">{error}</p>
              </div>
            ) : paginatedShifts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                  No shifts to show in this list yet.
                </p>
              </div>
            ) : (
              paginatedShifts.map((shift) => {
                const dspName = shift.employee?.fullName || shift.assignedDsp || "Unassigned";
                const resolvedClientName = shift.client
                  ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() ||
                    clientName
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
                    onDetails={
                      shiftDetailsRoute
                        ? () => {
                            setShiftMenuOpenForId(null);
                            navigate(generatePath(shiftDetailsRoute, { shiftId: shift.id }));
                          }
                        : undefined
                    }
                  />
                );
              })
            )}
          </div>

          {!isLoading && !error && shifts.length > 0 && (
            <AgencyPagination
              summary={`Showing ${paginatedShifts.length} of ${shifts.length} shifts`}
              page={Math.min(currentPage, totalPages)}
              pages={totalPages}
              onPage={(next) => setCurrentPage(Math.min(totalPages, Math.max(1, next)))}
            />
          )}
          </div>
        </div>
      )}
    </>
  );
}
