import { memo } from "react";
import {
  ChevronDown,
  FileText,
  Pencil,
  Trash2,
  Wrench,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ShiftRowStatusInfo } from "@/lib/shift-row-status";

export type DspShiftScheduleListRowProps = {
  clientName: string;
  clientImageUrl?: string;
  clientInitials: string;
  dspName: string;
  dspImageUrl?: string;
  dspInitials: string;
  /** When null/undefined, Date column is omitted */
  dateLabel?: string | null;
  locationAddress: string;
  /** Optional duration pill (e.g. upcoming tab) */
  durationLabel?: string | null;
  statusInfo: ShiftRowStatusInfo;
  clockedInDisplay: string;
  clockedOutDisplay: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onDetails: () => void;
  onEdit: () => void;
  onMaintenance: () => void;
  onDelete: () => void;
  showApproveMenuItem?: boolean;
  onApprove?: () => void;
};

function DspShiftScheduleListRowInner({
  clientName,
  clientImageUrl,
  clientInitials,
  dspName,
  dspImageUrl,
  dspInitials,
  dateLabel,
  locationAddress,
  durationLabel,
  statusInfo,
  clockedInDisplay,
  clockedOutDisplay,
  menuOpen,
  onMenuOpenChange,
  onDetails,
  onEdit,
  onMaintenance,
  onDelete,
  showApproveMenuItem,
  onApprove,
}: DspShiftScheduleListRowProps) {
  const loc = locationAddress.trim() ? locationAddress : "-";

  return (
    <div className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px]">
      <div className="flex items-center gap-4 w-[256px] shrink-0">
        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
          {clientImageUrl ? (
            <AvatarImage
              src={clientImageUrl}
              alt={clientName}
              className="w-full h-full object-cover aspect-auto"
            />
          ) : null}
          <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
            {clientInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[16px] font-semibold leading-[1.6] text-black truncate">
            {clientName}
          </span>
          <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">Client</span>
        </div>
      </div>

      <div className="flex items-center gap-4 w-[256px] shrink-0">
        <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
          {dspImageUrl ? (
            <AvatarImage
              src={dspImageUrl}
              alt={dspName}
              className="w-full h-full object-cover aspect-auto"
            />
          ) : null}
          <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
            {dspInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[16px] font-semibold leading-[1.6] text-black truncate">
            {dspName}
          </span>
          <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">DSP</span>
        </div>
      </div>

      {dateLabel != null && dateLabel !== "" ? (
        <div className="flex flex-col gap-0.5 min-w-[100px] max-w-[140px] shrink-0 text-[14px] font-medium leading-[1.4]">
          <span className="text-[#808081] whitespace-nowrap">Date</span>
          <span className="text-[#10141a]">{dateLabel}</span>
        </div>
      ) : null}

      <div className="min-w-0 flex-1 basis-[200px] max-w-md text-[14px] font-medium leading-[1.4]">
        <span className="text-[#808081] block">Location</span>
        <span className="text-[#10141a] break-words">{loc}</span>
      </div>

      {durationLabel ? (
        <div className="shrink-0">
          <span className="px-4 py-1.5 rounded-full text-xs font-medium border border-teal-400 text-teal-600 bg-white whitespace-nowrap">
            {durationLabel}
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-16 flex-1 min-w-[100px] shrink-0">
        <div
          className="rounded-full min-w-[54px] min-h-7 flex items-center justify-center gap-1 px-2.5"
          style={{
            backgroundColor: statusInfo.bgColor,
            border: `1px solid ${statusInfo.color}`,
          }}
        >
          <span className="text-[12px] font-semibold" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-16 flex-1 min-w-[100px] shrink-0">
        <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
          <span className="text-[#808081] whitespace-nowrap">Clocked In </span>
          <span className="text-[#10141a]">{clockedInDisplay}</span>
        </div>
      </div>

      <div className="flex items-center gap-16 flex-1 min-w-[100px] shrink-0">
        <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
          <span className="text-[#808081] whitespace-nowrap">Clocked Out </span>
          <span className="text-[#10141a]">{clockedOutDisplay}</span>
        </div>
      </div>

      <Popover open={menuOpen} onOpenChange={onMenuOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 rounded-full border-[rgba(255,255,255,0.6)] bg-white px-4 text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white shrink-0"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-label={`Shift actions for ${clientName}`}
          >
            Actions
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(calc(100vw-2rem),15.5rem)] border border-white/40 bg-[#FFFFFFF2] p-1 shadow-lg backdrop-blur-md"
          align="end"
        >
          <div className="flex flex-col gap-0.5" role="menu">
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
              aria-label="Open full shift details page"
              onClick={onDetails}
            >
              <FileText className="size-4 shrink-0 text-[#808081]" aria-hidden />
              Details
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
              aria-label="Edit this shift in the schedule"
              onClick={onEdit}
            >
              <Pencil className="size-4 shrink-0 text-[#808081]" aria-hidden />
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
              aria-label="Adjust clock times, notes, or mark shift completed"
              onClick={onMaintenance}
            >
              <Wrench className="size-4 shrink-0 text-[#808081]" aria-hidden />
              Maintenance
            </button>
            {showApproveMenuItem && onApprove ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                aria-label="Approve manual shift"
                onClick={onApprove}
              >
                <CheckCircle className="size-4 shrink-0 text-[#808081]" aria-hidden />
                Approve
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#D53411] hover:bg-red-50"
              aria-label="Delete this shift from the schedule"
              onClick={onDelete}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              Delete
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const DspShiftScheduleListRow = memo(DspShiftScheduleListRowInner);
