import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BILLING_CHECKBOX_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { mapBundleRowsToPreviewItems } from "../utils/claimBundleUtils";

type PreviewItem = ReturnType<typeof mapBundleRowsToPreviewItems>[number];

const PreviewItemRow = memo(function PreviewItemRow({
  title,
  metaLine,
  checked,
  onToggle,
}: {
  title: string;
  metaLine: string;
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
    </label>
  );
});

type ClaimPreviewSectionProps = {
  title: string;
  items: PreviewItem[];
  selectedIds: Set<string>;
  totalAmount: number;
  onToggleItem: (id: string) => void;
  onToggleAll: (itemIds: string[], checked: boolean) => void;
};

export default function ClaimPreviewSection({
  title,
  items,
  selectedIds,
  totalAmount,
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
            checked={selectedIds.has(item.id)}
            onToggle={() => onToggleItem(item.id)}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#e5e5e6] pt-4">
        <span className="text-[14px] font-semibold text-[#10141a]">Total</span>
        <span className="text-[14px] font-semibold tabular-nums text-[#10141a]">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
