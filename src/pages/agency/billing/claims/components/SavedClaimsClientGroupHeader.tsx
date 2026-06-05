import ClientNameLink from "./ClientNameLink";
import type { SavedClaimClientGroup } from "../utils/groupSavedClaimsByClient";

type SavedClaimsClientGroupHeaderProps = {
  group: SavedClaimClientGroup;
  variant: "mobile" | "desktop";
};

export default function SavedClaimsClientGroupHeader({
  group,
  variant,
}: SavedClaimsClientGroupHeaderProps) {
  const claimLabel =
    group.claims.length === 1 ? "1 claim" : `${group.claims.length} claims`;

  if (variant === "mobile") {
    return (
      <div className="px-1 pb-1 pt-3">
        <ClientNameLink
          name={group.clientName}
          clientId={group.clientId}
          className="text-[16px] font-semibold text-[#10141a]"
        />
        <p className="mt-1 text-[13px] text-[#808081]">{claimLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-[#e5e5e6] bg-[#eef4f5] px-4 py-3 pr-8">
      <ClientNameLink
        name={group.clientName}
        clientId={group.clientId}
        className="text-[14px] font-semibold text-[#10141a]"
      />
      <span className="shrink-0 text-[13px] text-[#808081]">{claimLabel}</span>
    </div>
  );
}
