import { ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon } from "@/components/ui/dot-grid-menu";
import { cn } from "@/lib/utils";
import ClientNameLink from "./ClientNameLink";
import type { RecentClaimClientGroup } from "../utils/groupRecentClaimsByClient";

const menuItemClassName =
  "flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-none px-4 py-3 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] focus:bg-[#eef4f5]";

type RecentClaimsClientGroupHeaderProps = {
  group: RecentClaimClientGroup;
  variant: "mobile" | "desktop";
  onGenerateClaim: (group: RecentClaimClientGroup) => void;
  generateDisabled?: boolean;
};

export default function RecentClaimsClientGroupHeader({
  group,
  variant,
  onGenerateClaim,
  generateDisabled = false,
}: RecentClaimsClientGroupHeaderProps) {
  const itemLabel = group.claims.length === 1 ? "1 item" : `${group.claims.length} items`;
  const isMobile = variant === "mobile";
  // Coverage is now per line (shown in the row's Coverage column), so the group action is generic.
  const generateLabel = "Generate bills";

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={generateDisabled}>
        <button
          type="button"
          aria-label={`Claim actions for ${group.clientName}`}
          disabled={generateDisabled}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            isMobile ? "h-11 w-11" : "h-8 w-8",
            generateDisabled ? "cursor-not-allowed opacity-50" : "",
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
          onSelect={() => onGenerateClaim(group)}
        >
          {generateLabel}
          <ChevronRight className="ml-auto h-4 w-4 text-[#808081]" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    return (
      <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ClientNameLink
              name={group.clientName}
              clientId={group.clientId}
              className="text-[16px] font-semibold text-[#10141a]"
            />
          </div>
          <p className="mt-1 text-[13px] text-[#808081]">{itemLabel}</p>
        </div>
        {actionsMenu}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e5e5e6] bg-[#eef4f5] px-4 py-3 pr-8">
      <div className="flex min-w-0 items-center gap-3">
        <ClientNameLink
          name={group.clientName}
          clientId={group.clientId}
          className="text-[14px] font-semibold text-[#10141a]"
        />
        <span className="shrink-0 text-[13px] text-[#808081]">{itemLabel}</span>
      </div>
      {actionsMenu}
    </div>
  );
}
