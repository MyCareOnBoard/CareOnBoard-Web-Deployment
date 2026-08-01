import { ChevronDown, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SHIFT_CATEGORY_OPTIONS,
  shiftCategoryLabel,
  type ShiftCategory,
} from "@/lib/shift-category";

interface ShiftCategoryFilterProps {
  value: ShiftCategory | null;
  onChange: (value: ShiftCategory | null) => void;
}

export default function ShiftCategoryFilter({ value, onChange }: ShiftCategoryFilterProps) {
  const selectedValue = value ?? "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Filter shifts, ${shiftCategoryLabel(value)}`}
          className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#cfdada] bg-white px-3.5 text-xs font-semibold text-[#355758] transition-colors hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
        >
          <Filter aria-hidden="true" className="h-4 w-4" />
          <span className="max-w-36 truncate">{shiftCategoryLabel(value)}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#dce5e5] bg-white p-1.5">
        <DropdownMenuRadioGroup
          value={selectedValue}
          onValueChange={(next) => onChange(next === "all" ? null : next as ShiftCategory)}
        >
          <DropdownMenuRadioItem value="all" className="min-h-11 cursor-pointer rounded-lg pr-8 text-sm">
            All shifts
          </DropdownMenuRadioItem>
          {SHIFT_CATEGORY_OPTIONS.map(({ value: optionValue, label }) => (
            <DropdownMenuRadioItem
              key={optionValue}
              value={optionValue}
              className="min-h-11 cursor-pointer rounded-lg pr-8 text-sm"
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
