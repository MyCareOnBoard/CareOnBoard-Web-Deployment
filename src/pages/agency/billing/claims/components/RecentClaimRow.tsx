import { memo } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import ClientNameLink from "./ClientNameLink";
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
  return staffId.slice(0, STAFF_ID_DISPLAY_LENGTH);
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

type RowVariant = "mobile" | "desktop";

type RecentClaimRowProps = {
  claim: RecentClaim;
  variant: RowVariant;
  onGenerateClaim: (claim: RecentClaim) => void;
  generateDisabled?: boolean;
};

function DurationRange({ start, end }: { start: string; end: string }) {
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

function ClaimActionsMenu({
  claim,
  variant,
  onGenerateClaim,
  generateDisabled = false,
}: {
  claim: RecentClaim;
  variant: RowVariant;
  onGenerateClaim: (claim: RecentClaim) => void;
  generateDisabled?: boolean;
}) {
  const isMobile = variant === "mobile";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Claim actions"
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-md bg-[#eef4f5] transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            isMobile ? "h-11 w-11" : "h-8 w-8"
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
          disabled={generateDisabled}
          onSelect={() => onGenerateClaim(claim)}
        >
          Generate claim
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecentClaimRow({
  claim,
  variant,
  onGenerateClaim,
  generateDisabled = false,
}: RecentClaimRowProps) {
  if (variant === "mobile") {
    return (
      <div className="relative rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="absolute right-2 top-2">
          <ClaimActionsMenu
            claim={claim}
            variant="mobile"
            onGenerateClaim={onGenerateClaim}
            generateDisabled={generateDisabled}
          />
        </div>

        <ClientNameLink
          name={claim.client}
          clientId={claim.clientId}
          className="pr-14 text-[15px] font-semibold text-[#10141a]"
        />

        <div className="mt-4 space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Staff ID</span>
            <StaffIdLink staffId={claim.staffId} />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Service date</span>
            <span className="text-[13px] font-medium text-[#10141a]">{claim.serviceDate}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Duration</span>
            <DurationRange start={claim.durationStart} end={claim.durationEnd} />
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Rate</span>
            <span className="text-[13px] font-medium text-[#10141a] tabular-nums">{claim.rate}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e5e5e6] pt-4">
          <div>
            <p className="text-[12px] text-[#808081]">Service code</p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a]">{claim.serviceCode}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#808081]">PA Number</p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a]">{claim.paNumber}</p>
          </div>
          <div>
            <p className="text-[12px] text-[#808081]">Total hours</p>
            <p className="mt-1 text-[13px] font-medium text-[#10141a] tabular-nums">{claim.totalHours}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={TABLE_ROW_CLASS}>
      <ClientNameLink
        name={claim.client}
        clientId={claim.clientId}
        className="text-[14px] font-medium text-[#10141a]"
      />
      <StaffIdLink staffId={claim.staffId} />
      <span className="text-[13px] text-[#10141a]">{claim.serviceCode}</span>
      <span className="text-[13px] text-[#10141a]">{claim.paNumber}</span>
      <span className="text-[13px] text-[#10141a]">{claim.serviceDate}</span>
      <DurationRange start={claim.durationStart} end={claim.durationEnd} />
      <span className="text-[13px] text-[#10141a] tabular-nums">{claim.totalHours}</span>
      <span className="text-[13px] text-[#10141a] tabular-nums">{claim.rate}</span>
      <div className="flex justify-end">
        <ClaimActionsMenu
          claim={claim}
          variant="desktop"
          onGenerateClaim={onGenerateClaim}
          generateDisabled={generateDisabled}
        />
      </div>
    </div>
  );
}

export default memo(RecentClaimRow);
