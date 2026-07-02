import ClientNameLink from "./ClientNameLink";
import OutOfPocketBadge, { PayerInsuranceBadge } from "./OutOfPocketBadge";

type SavedClaimsClientGroupHeaderProps = {
  clientName: string;
  clientId?: string;
  count: number;
  variant: "mobile" | "desktop";
  /** "claim" or "invoice" — pluralized for the count label. */
  itemNoun?: string;
  outOfPocket?: boolean;
};

export default function SavedClaimsClientGroupHeader({
  clientName,
  clientId,
  count,
  variant,
  itemNoun = "claim",
  outOfPocket = false,
}: SavedClaimsClientGroupHeaderProps) {
  const label = count === 1 ? `1 ${itemNoun}` : `${count} ${itemNoun}s`;

  if (variant === "mobile") {
    return (
      <div className="px-1 pb-1 pt-3">
        <div className="flex items-center gap-2">
          <ClientNameLink
            name={clientName}
            clientId={clientId}
            className="text-[16px] font-semibold text-[#10141a]"
          />
          {outOfPocket ? <OutOfPocketBadge /> : <PayerInsuranceBadge />}
        </div>
        <p className="mt-1 text-[13px] text-[#808081]">{label}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-[#e5e5e6] bg-[#eef4f5] px-4 py-3 pr-8">
      <ClientNameLink
        name={clientName}
        clientId={clientId}
        className="text-[14px] font-semibold text-[#10141a]"
      />
      {outOfPocket ? <OutOfPocketBadge /> : <PayerInsuranceBadge />}
      <span className="shrink-0 text-[13px] text-[#808081]">{label}</span>
    </div>
  );
}
