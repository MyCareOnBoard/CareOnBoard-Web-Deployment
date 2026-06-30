import { cn } from "@/lib/utils";
import { COVERAGE, type Coverage } from "@/lib/coverage";

/**
 * Per-entry coverage badge for the ready-to-bill list. A `both` line shows the
 * Payer / Insurance and Out of pocket badges stacked; a leg already billed
 * (needs* === false) is dimmed so a half-billed line stays visible.
 */
function Pill({
  label,
  tone,
  billed,
}: {
  label: string;
  tone: "payer" | "oop";
  billed?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "oop" ? "bg-[#FFF7E6] text-[#8A5A00]" : "bg-[#e6fafa] text-[#0c5d5f]",
        billed && "opacity-40 line-through",
      )}
      title={billed ? "Already billed" : undefined}
    >
      {label}
    </span>
  );
}

export default function CoverageBadge({
  coverage,
  needsClaim,
  needsInvoice,
}: {
  coverage?: Coverage;
  needsClaim?: boolean;
  needsInvoice?: boolean;
}) {
  const cov = coverage ?? COVERAGE.PAYER;

  if (cov === COVERAGE.OUT_OF_POCKET) {
    return <Pill label="Out of pocket" tone="oop" billed={needsInvoice === false} />;
  }

  if (cov === COVERAGE.BOTH) {
    return (
      <span className="flex flex-col gap-1">
        <Pill label="Payer / Insurance" tone="payer" billed={needsClaim === false} />
        <Pill label="Out of pocket" tone="oop" billed={needsInvoice === false} />
      </span>
    );
  }

  return <Pill label="Payer / Insurance" tone="payer" billed={needsClaim === false} />;
}
