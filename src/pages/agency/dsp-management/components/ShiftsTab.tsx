import { useState, useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Shift, categorizeShifts, formatShiftLocation } from "@/lib/api/shifts";

interface ShiftsTabProps {
  shifts: Shift[];
  isLoading: boolean;
  getInitials: (name: string) => string;
}

function getClientName(shift: Shift): string {
  if (!shift.client) return "Unknown Client";
  const first = shift.client.firstName || "";
  const last = shift.client.lastName || "";
  return `${first} ${last}`.trim() || "Unknown Client";
}

export function ShiftsTab({ shifts, isLoading, getInitials }: ShiftsTabProps) {
  const [shiftsTab, setShiftsTab] = useState<"previous" | "ongoing" | "upcoming">("previous");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Categorize shifts into previous/ongoing/upcoming using the existing utility
  const categorized = useMemo(() => categorizeShifts(shifts), [shifts]);

  // Get the filtered shifts for the active sub-tab
  const filteredShifts = useMemo(() => {
    switch (shiftsTab) {
      case "previous":
        return categorized.previous;
      case "ongoing":
        return categorized.current ? [categorized.current] : [];
      case "upcoming":
        return categorized.upcoming;
      default:
        return [];
    }
  }, [shiftsTab, categorized]);

  // Reset page when switching tabs
  const handleTabChange = (tab: "previous" | "ongoing" | "upcoming") => {
    setShiftsTab(tab);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));
  const paginatedShifts = filteredShifts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Shifts Tab Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleTabChange("previous")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            shiftsTab === "previous"
              ? "bg-gray-900 text-white"
              : " text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Previous Shifts
          {categorized.previous.length > 0 && (
            <span className="ml-1.5 text-xs opacity-70">({categorized.previous.length})</span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("ongoing")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            shiftsTab === "ongoing"
              ? "bg-gray-900 text-white"
              : " text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Ongoing Shifts
          {categorized.current && (
            <span className="ml-1.5 text-xs opacity-70">(1)</span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("upcoming")}
          className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
            shiftsTab === "upcoming"
              ? "bg-gray-900 text-white"
              : " text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Upcoming Shifts
          {categorized.upcoming.length > 0 && (
            <span className="ml-1.5 text-xs opacity-70">({categorized.upcoming.length})</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B4B8]"></div>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-gray-500">No {shiftsTab} shifts available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedShifts.map((shift) => {
            const clientName = getClientName(shift);
            return (
              <div key={shift.id} className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={shift.client?.profileImage} alt={clientName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{clientName}</p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm text-gray-900">{new Date(shift.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm text-gray-900">{formatShiftLocation(shift.location) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm text-gray-900">{shift.startTime}{shift.endTime ? ` - ${shift.endTime}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Clocked In</p>
                    <p className="text-sm text-gray-900">{shift.clockedInAt ? new Date(shift.clockedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Clocked Out</p>
                    <p className="text-sm text-gray-900">{shift.clockedOutAt ? new Date(shift.clockedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</p>
                  </div>
                  
                  {shiftsTab === "upcoming" && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">
                        {shift.sessionDuration || 'N/A'}
                      </span>
                      <button className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 cursor-pointer">
                        Details
                      </button>
                    </div>
                  )}
                  
                  {shiftsTab === "ongoing" && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                        In Progress
                      </span>
                    </div>
                  )}
                  
                  {shiftsTab === "previous" && (
                    <span className={`px-3 py-1 rounded-md text-xs font-medium ${
                      shift.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {shift.status === 'completed' ? 'Completed' : shift.sessionDuration || shift.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredShifts.length > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
