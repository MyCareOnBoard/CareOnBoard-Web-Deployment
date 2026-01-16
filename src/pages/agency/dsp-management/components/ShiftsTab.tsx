import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DSPShift } from "../types";
import { formatShiftLocation } from "@/lib/api/shifts";

interface ShiftsTabProps {
  shifts: DSPShift[];
  isLoading: boolean;
  getInitials: (name: string) => string;
}

export function ShiftsTab({ shifts, isLoading, getInitials }: ShiftsTabProps) {
  const [shiftsTab, setShiftsTab] = useState<"previous" | "ongoing" | "upcoming">("previous");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  return (
    <div className="space-y-4">
      {/* Shifts Tab Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShiftsTab("previous")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            shiftsTab === "previous"
              ? "bg-gray-900 text-white"
              : " text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Previous Shifts
        </button>
        <button
          onClick={() => setShiftsTab("ongoing")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            shiftsTab === "ongoing"
              ? "bg-gray-900 text-white"
              : " text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Ongoing Shifts
        </button>
        <button
          onClick={() => setShiftsTab("upcoming")}
          className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
            shiftsTab === "upcoming"
              ? "bg-gray-900 text-white"
              : " text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Upcoming Shifts
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B4B8]"></div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-gray-500">No {shiftsTab} shifts available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.slice((page - 1) * pageSize, page * pageSize).map((shift) => {
            return (
              <div key={shift.id} className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={shift.clientImage} alt={shift.clientName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(shift.clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{shift.clientName}</p>
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
                        {shift.duration || 'N/A'}
                      </span>
                      <button className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 cursor-pointer">
                        Details
                      </button>
                    </div>
                  )}
                  
                  {shiftsTab === "ongoing" && (
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 cursor-pointer">
                        ✓ Approve
                      </button>
                      <button className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="px-4 py-1 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 cursor-pointer">
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                  
                  {shiftsTab === "previous" && (
                    <span className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-xs font-medium">
                      {shift.duration || 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && shifts.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-sm text-gray-600">{page} / {Math.ceil(shifts.length / pageSize)}</span>
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
            onClick={() => setPage(Math.min(Math.ceil(shifts.length / pageSize), page + 1))}
            disabled={page === Math.ceil(shifts.length / pageSize)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
