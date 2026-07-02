/** Amber pill marking out-of-pocket (payer/family-paid) clients across the claims UI. */
export default function OutOfPocketBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[#FFF7E6] px-2 py-0.5 text-[11px] font-semibold text-[#8A5A00]">
      Out of pocket
    </span>
  );
}

/** Teal pill marking payer/insurance-billed claims — counterpart to OutOfPocketBadge. */
export function PayerInsuranceBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[#e6fafa] px-2 py-0.5 text-[11px] font-semibold text-[#0c5d5f]">
      Payer / Insurance
    </span>
  );
}
