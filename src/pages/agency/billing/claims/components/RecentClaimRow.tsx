import { memo } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { TABLE_ROW_CLASS } from "./tableColumns";

type RowVariant = "mobile" | "desktop";

type RecentClaimRowProps = {
  claim: RecentClaim;
  variant: RowVariant;
  onEditClaim: (claim: RecentClaim) => void;
  onGenerateClaim: (claim: RecentClaim) => void;
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
  onEditClaim,
  onGenerateClaim,
}: {
  claim: RecentClaim;
  variant: RowVariant;
  onEditClaim: (claim: RecentClaim) => void;
  onGenerateClaim: (claim: RecentClaim) => void;
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
          onSelect={() => onEditClaim(claim)}
        >
          Edit client claim
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#e5e5e6]" />
        <DropdownMenuItem
          className={menuItemClassName}
          onSelect={() => onGenerateClaim(claim)}
        >
          Generate claim
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecentClaimRow({ claim, variant, onEditClaim, onGenerateClaim }: RecentClaimRowProps) {
  if (variant === "mobile") {
    return (
      <div className="relative rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="absolute right-2 top-2">
          <ClaimActionsMenu
            claim={claim}
            variant="mobile"
            onEditClaim={onEditClaim}
            onGenerateClaim={onGenerateClaim}
          />
        </div>

        <p className="pr-14 text-[15px] font-semibold text-[#10141a]">{claim.client}</p>

        <div className="mt-4 space-y-3">
          <div className="flex justify-between gap-4">
            <span className="text-[13px] text-[#808081]">Staff ID</span>
            <span className="text-[13px] font-medium text-[#808081]">ID: {claim.staffId}</span>
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
      <span className="truncate text-[14px] font-medium text-[#10141a]">{claim.client}</span>
      <span className="text-[13px] text-[#808081]">ID: {claim.staffId}</span>
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
          onEditClaim={onEditClaim}
          onGenerateClaim={onGenerateClaim}
        />
      </div>
    </div>
  );
}

export default memo(RecentClaimRow);
