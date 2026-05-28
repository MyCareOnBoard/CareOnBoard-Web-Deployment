import { memo } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import type { DuePayrollEntry } from "../data/mockPayrollDashboardData";
import { TABLE_ROW_CLASS } from "./tableColumns";

const MISSING_STAFF_ID = "—";
const STAFF_ID_DISPLAY_LENGTH = 6;

function isStaffIdLinkable(staffId: string): boolean {
  const trimmed = staffId.trim();
  return Boolean(trimmed) && trimmed !== MISSING_STAFF_ID;
}

function formatStaffIdDisplay(staffId: string): string {
  if (!isStaffIdLinkable(staffId)) {
    return staffId.trim() || MISSING_STAFF_ID;
  }
  return `ID: ${staffId.slice(0, STAFF_ID_DISPLAY_LENGTH)}`;
}

function StaffIdLink({ staffId }: { staffId: string }) {
  const displayId = formatStaffIdDisplay(staffId);

  if (!isStaffIdLinkable(staffId)) {
    return <span className="text-[13px] text-[#808081]">{displayId}</span>;
  }

  return (
    <Link
      to={Routes.agency.dspProfile.replace(":dspId", staffId.trim())}
      className="text-[13px] font-medium text-[#10141a] transition-colors hover:text-[#00b4b8] hover:underline"
    >
      {displayId}
    </Link>
  );
}

function DateRange({ start, end }: { start: string; end: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#10141a]">
      <span>{start}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#808081]" aria-hidden="true" />
      <span>{end}</span>
    </span>
  );
}

function DotGridIcon() {
  return (
    <span className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} className="h-[4px] w-[4px] rounded-full bg-[#808081]" />
      ))}
    </span>
  );
}

const menuItemClassName =
  "flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-none px-4 py-3 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] focus:bg-[#eef4f5]";

function PayrollActionsMenu({
  entry,
  variant,
  onEditDetails,
  onGenerateInvoice,
}: {
  entry: DuePayrollEntry;
  variant: "mobile" | "desktop";
  onEditDetails: (entry: DuePayrollEntry) => void;
  onGenerateInvoice: (entry: DuePayrollEntry) => void;
}) {
  const isMobile = variant === "mobile";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Payroll actions"
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-md bg-[#eef4f5] transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            isMobile ? "h-11 w-11" : "h-8 w-8",
          )}
        >
          <DotGridIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={isMobile ? 4 : 8}
        collisionPadding={16}
        className="z-[100] w-[220px] rounded-xl border border-[#e5e5e6] bg-white p-0 shadow-lg"
      >
        <DropdownMenuItem
          className={menuItemClassName}
          onSelect={() => onEditDetails(entry)}
        >
          Edit details
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#e5e5e6]" />
        <DropdownMenuItem
          className={menuItemClassName}
          onSelect={() => onGenerateInvoice(entry)}
        >
          Generate invoice
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DuePayrollRowProps = {
  entry: DuePayrollEntry;
  variant: "mobile" | "desktop";
  onEditDetails: (entry: DuePayrollEntry) => void;
  onGenerateInvoice: (entry: DuePayrollEntry) => void;
};

function DuePayrollRow({ entry, variant, onEditDetails, onGenerateInvoice }: DuePayrollRowProps) {
  if (variant === "mobile") {
    return (
      <div className="relative rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="absolute right-2 top-2">
          <PayrollActionsMenu
            entry={entry}
            variant="mobile"
            onEditDetails={onEditDetails}
            onGenerateInvoice={onGenerateInvoice}
          />
        </div>

        <span className="pr-14 text-[15px] font-semibold text-[#10141a]">{entry.staffName}</span>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Staff ID</span>
            <StaffIdLink staffId={entry.staffId} />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Hours worked</span>
            <span className="text-[13px] font-medium tabular-nums text-[#10141a]">
              {entry.hoursWorked}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Date range</span>
            <DateRange start={entry.dateRangeStart} end={entry.dateRangeEnd} />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">PA Rate</span>
            <span className="text-[13px] font-medium tabular-nums text-[#10141a]">
              {entry.paRate}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-[#e5e5e6] pt-4">
          <p className="text-[12px] text-[#808081]">Payment details</p>
          <p className="mt-1 text-[13px] font-medium text-[#10141a]">{entry.paymentDetails}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={TABLE_ROW_CLASS}>
      <span className="truncate text-[14px] font-medium text-[#10141a]">{entry.staffName}</span>
      <StaffIdLink staffId={entry.staffId} />
      <span className="text-[13px] tabular-nums text-[#10141a]">{entry.hoursWorked}</span>
      <DateRange start={entry.dateRangeStart} end={entry.dateRangeEnd} />
      <span className="truncate text-[13px] text-[#10141a]">{entry.paymentDetails}</span>
      <span className="text-[13px] tabular-nums text-[#10141a]">{entry.paRate}</span>
      <div className="flex justify-end">
        <PayrollActionsMenu
          entry={entry}
          variant="desktop"
          onEditDetails={onEditDetails}
          onGenerateInvoice={onGenerateInvoice}
        />
      </div>
    </div>
  );
}

export default memo(DuePayrollRow);
