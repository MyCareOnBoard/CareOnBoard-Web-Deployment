import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  shifts,
  currentPage,
  setCurrentPage,
  itemsPerPage,
}: {
  clientName: string;
  shifts: ShiftRow[];
  currentPage: number;
  setCurrentPage: (next: number) => void;
  itemsPerPage: number;
}) {
  const totalPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage));

  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return shifts.slice(start, start + itemsPerPage);
  }, [shifts, currentPage, itemsPerPage]);

  return (
    <>
      {/* Shifts Header */}
      <div className="mt-8">
        <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
          Shifts
        </p>
        <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
          These Are Ongoing Shift Of {clientName}
        </p>
      </div>

      {/* Shift Rows */}
      <div className="mt-4 space-y-3">
        {paginatedShifts.map((shift) => (
          <div
            key={shift.id}
            className="flex items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
          >
            <Avatar className="w-[52.5px] h-[60px] rounded-lg shrink-0">
              {shift.avatarUrl && (
                <AvatarImage
                  src={shift.avatarUrl}
                  alt={shift.dspName}
                  className="w-full h-full object-cover aspect-auto rounded-lg"
                />
              )}
              <AvatarFallback className="w-full h-full rounded-lg bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
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
                <p className="text-[#10141a]">{shift.location}</p>
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
        ))}
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


