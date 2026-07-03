import { memo } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon } from "@/components/ui/dot-grid-menu";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { DuePayrollEntry } from "@/lib/api/payroll";
import { formatPayrollDateRangeLabel } from "../utils/payrollDashboardUtils";
import { TABLE_ROW_CLASS } from "./tableColumns";

const MISSING_STAFF_ID = "—";
const STAFF_ID_DISPLAY_LENGTH = 6;

function normalizeStaffId(staffId: string): string {
  return staffId.trim().replace(/^ID:\s*/i, "");
}

function isStaffIdLinkable(staffId: string): boolean {
  const normalized = normalizeStaffId(staffId);
  return Boolean(normalized) && normalized !== MISSING_STAFF_ID;
}

function formatStaffIdDisplay(staffId: string): string {
  const normalized = normalizeStaffId(staffId);
  if (!isStaffIdLinkable(normalized)) {
    return normalized || MISSING_STAFF_ID;
  }
  return normalized.slice(0, STAFF_ID_DISPLAY_LENGTH);
}

function StaffIdLink({ staffId, employeeId }: { staffId: string; employeeId: string }) {
  const displayId = formatStaffIdDisplay(staffId);

  if (!isStaffIdLinkable(staffId)) {
    return <span className="text-[13px] text-[#808081]">{displayId}</span>;
  }

  return (
    <Link
      to={Routes.agency.dspProfile.replace(":dspId", employeeId.trim())}
      className="text-[13px] font-medium text-[#10141a] transition-colors hover:text-[#00b4b8] hover:underline"
    >
      {displayId}
    </Link>
  );
}

function DateRange({ start, end }: { start: string; end: string }) {
  const label = formatPayrollDateRangeLabel(start, end);

  return (
    <span
      className="block truncate whitespace-nowrap text-[13px] tabular-nums text-[#10141a]"
      title={label}
    >
      {label}
    </span>
  );
}

const menuItemClassName =
  "flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-none px-4 py-3 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] focus:bg-[#eef4f5]";

function PayrollActionsMenu({
  entry,
  variant,
  disabled,
  onCreateInvoiceClick,
}: {
  entry: DuePayrollEntry;
  variant: "mobile" | "desktop";
  disabled?: boolean;
  onCreateInvoiceClick: (entry: DuePayrollEntry) => void;
}) {
  const isMobile = variant === "mobile";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label="Payroll actions"
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-center rounded-md bg-[#eef4f5] transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            isMobile ? "h-11 w-11" : "h-8 w-8",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
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
          onSelect={() => onCreateInvoiceClick(entry)}
        >
          Create payroll invoice
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function grossPayBreakdown(entry: DuePayrollEntry) {
  const shiftPayTotal = entry.shiftPayTotal ?? 0;
  const ridePayTotal = entry.ridePayTotal ?? 0;
  const expenseTotal = entry.expenseTotal ?? 0;
  const travelPayTotal = entry.travelPayTotal ?? 0;

  if (shiftPayTotal <= 0 && ridePayTotal <= 0 && expenseTotal <= 0 && travelPayTotal <= 0) {
    return null;
  }

  const parts: string[] = [];
  if (shiftPayTotal > 0) {
    parts.push(`Shift pay ${formatCurrency(shiftPayTotal)}`);
  }
  if (ridePayTotal > 0) {
    parts.push(`mileage ${formatCurrency(ridePayTotal)}`);
  }
  if (travelPayTotal > 0) {
    parts.push(`travel time ${formatCurrency(travelPayTotal)}`);
  }
  if (expenseTotal > 0) {
    parts.push(`reimbursements ${formatCurrency(expenseTotal)}`);
  }

  return parts.join(" + ");
}

type DuePayrollRowProps = {
  entry: DuePayrollEntry;
  variant: "mobile" | "desktop";
  actionsDisabled?: boolean;
  onCreateInvoiceClick: (entry: DuePayrollEntry) => void;
};

function DuePayrollRow({
  entry,
  variant,
  actionsDisabled = false,
  onCreateInvoiceClick,
}: DuePayrollRowProps) {
  const breakdown = grossPayBreakdown(entry);
  if (variant === "mobile") {
    return (
      <div className="relative rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="absolute right-2 top-2">
          <PayrollActionsMenu
            entry={entry}
            variant="mobile"
            disabled={actionsDisabled}
            onCreateInvoiceClick={onCreateInvoiceClick}
          />
        </div>

        <span className="pr-14 text-[15px] font-semibold text-[#10141a]">{entry.staffName}</span>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Staff ID</span>
            <StaffIdLink staffId={entry.staffId} employeeId={entry.employeeId} />
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
            <span className="text-[13px] text-[#808081]">Pay rate</span>
            <span className="text-[13px] font-medium tabular-nums text-[#10141a]">
              {entry.paRate}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-[#e5e5e6] pt-4">
          <p className="text-[12px] text-[#808081]">Payment details</p>
          <p className="mt-1 text-[13px] font-medium text-[#10141a]">{entry.paymentDetails}</p>
        </div>
        {(entry.grossAmount ?? 0) > 0 ? (
          <div className="mt-4 border-t border-[#e5e5e6] pt-4">
            <p className="text-[12px] text-[#808081]">Gross pay</p>
            <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#10141a]">
              {formatCurrency(entry.grossAmount ?? 0)}
            </p>
            {breakdown ? (
              <p className="mt-1 text-[12px] text-[#808081]">{breakdown}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={TABLE_ROW_CLASS}>
      <span className="truncate text-[14px] font-medium text-[#10141a]">{entry.staffName}</span>
      <StaffIdLink staffId={entry.staffId} employeeId={entry.employeeId} />
      <span className="text-[13px] tabular-nums text-[#10141a]">{entry.hoursWorked}</span>
      <DateRange start={entry.dateRangeStart} end={entry.dateRangeEnd} />
      <span className="truncate text-[13px] text-[#10141a]">{entry.paymentDetails}</span>
      <span className="text-[13px] tabular-nums text-[#10141a]">{entry.paRate}</span>
      <span className="text-[13px] tabular-nums text-[#10141a]">
        {(entry.expenseTotal ?? 0) > 0 ? formatCurrency(entry.expenseTotal ?? 0) : "—"}
      </span>
      <span className="text-[13px] font-medium tabular-nums text-[#10141a]" title={breakdown ?? undefined}>
        {formatCurrency(entry.grossAmount ?? 0)}
      </span>
      <div className="flex justify-end">
        <PayrollActionsMenu
          entry={entry}
          variant="desktop"
          disabled={actionsDisabled}
          onCreateInvoiceClick={onCreateInvoiceClick}
        />
      </div>
    </div>
  );
}

export default memo(DuePayrollRow);
