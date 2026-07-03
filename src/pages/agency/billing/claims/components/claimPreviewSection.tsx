import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BILLING_CHECKBOX_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { mapBundleRowsToPreviewItems } from "../utils/claimBundleUtils";

type PreviewItem = ReturnType<typeof mapBundleRowsToPreviewItems>[number];

// Coverage legend colors — match CoverageBadge (payer teal / out-of-pocket amber).
const PAYER_TEXT_CLASS = "text-[#0c5d5f]";
const OOP_TEXT_CLASS = "text-[#8A5A00]";

function LegendEntry({ label, dotClass, textClass }: { label: string; dotClass: string; textClass: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", textClass)}>
      <span className={cn("size-2 shrink-0 rounded-full", dotClass)} aria-hidden />
      {label}
    </span>
  );
}

export function CoverageLegend() {
  return (
    <div className="rounded-[10px] border border-[#e5e5e6] bg-[#fafafa] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendEntry label="Payer / Insurance" dotClass="bg-[#0c5d5f]" textClass={PAYER_TEXT_CLASS} />
        <LegendEntry label="Out of pocket" dotClass="bg-[#8A5A00]" textClass={OOP_TEXT_CLASS} />
      </div>
      <p className="mt-1.5 text-[12px] text-[#808081]">
        Each amount is billed to the matching party — payer amounts go on a claim, out-of-pocket
        amounts on a family invoice. A split-coverage line shows one amount of each.
      </p>
    </div>
  );
}

const PreviewItemRow = memo(function PreviewItemRow({
  title,
  metaLine,
  payerAmount,
  outOfPocketAmount,
  checked,
  onToggle,
}: {
  title: string;
  metaLine: string;
  payerAmount: number;
  outOfPocketAmount: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#e5e5e6] bg-white px-4 py-3">
      <Checkbox
        checked={checked}
        onChange={onToggle}
        className={cn(BILLING_CHECKBOX_CLASS, "mt-0.5 shrink-0")}
        aria-label={`Include ${title}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[#10141a]">{title}</p>
        <p className="mt-1 text-[13px] text-[#808081]">{metaLine}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {payerAmount > 0 && (
          <span
            className={cn("text-[13px] font-semibold tabular-nums", PAYER_TEXT_CLASS)}
            title="Payer / Insurance"
            aria-label={`Payer / Insurance ${formatCurrency(payerAmount)}`}
          >
            {formatCurrency(payerAmount)}
          </span>
        )}
        {outOfPocketAmount > 0 && (
          <span
            className={cn("text-[13px] font-semibold tabular-nums", OOP_TEXT_CLASS)}
            title="Out of pocket"
            aria-label={`Out of pocket ${formatCurrency(outOfPocketAmount)}`}
          >
            {formatCurrency(outOfPocketAmount)}
          </span>
        )}
      </div>
    </label>
  );
});

type ClaimPreviewSectionProps = {
  title: string;
  items: PreviewItem[];
  selectedIds: Set<string>;
  totalAmount: number;
  payerSubtotal: number;
  outOfPocketSubtotal: number;
  onToggleItem: (id: string) => void;
  onToggleAll: (itemIds: string[], checked: boolean) => void;
};

export default function ClaimPreviewSection({
  title,
  items,
  selectedIds,
  totalAmount,
  payerSubtotal,
  outOfPocketSubtotal,
  onToggleItem,
  onToggleAll,
}: ClaimPreviewSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const allSelected = items.every((item) => selectedIds.has(item.id));
  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;

  return (
    <div>
      <p className="mb-1 text-[13px] text-[#808081]">
        {selectedCount} of {items.length} items selected
      </p>
      <p className="mb-3 text-[14px] font-semibold text-[#10141a]">{title}</p>
      <div className="mb-3 flex min-h-[44px] items-center gap-3">
        <Checkbox
          checked={allSelected}
          onChange={() => onToggleAll(
            items.map((item) => item.id),
            !allSelected,
          )}
          className={BILLING_CHECKBOX_CLASS}
          aria-label={`Select all ${title.toLowerCase()}`}
        />
        <span className="text-[14px] font-medium text-[#10141a]">
          Select all ({items.length})
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <PreviewItemRow
            key={item.id}
            title={item.title}
            metaLine={item.metaLine}
            payerAmount={item.payerAmount}
            outOfPocketAmount={item.outOfPocketAmount}
            checked={selectedIds.has(item.id)}
            onToggle={() => onToggleItem(item.id)}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-[#e5e5e6] pt-4">
        <div className="flex items-center justify-between">
          <LegendEntry label="Payer / Insurance" dotClass="bg-[#0c5d5f]" textClass={PAYER_TEXT_CLASS} />
          <span className={cn("text-[13px] font-semibold tabular-nums", PAYER_TEXT_CLASS)}>
            {formatCurrency(payerSubtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <LegendEntry label="Out of pocket" dotClass="bg-[#8A5A00]" textClass={OOP_TEXT_CLASS} />
          <span className={cn("text-[13px] font-semibold tabular-nums", OOP_TEXT_CLASS)}>
            {formatCurrency(outOfPocketSubtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[14px] font-semibold text-[#10141a]">Total</span>
          <span className="text-[14px] font-semibold tabular-nums text-[#10141a]">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
