/**
 * Shared billing-coverage selector: choose Payer / Insurance, Out of pocket, or
 * Both (with a flat/percentage split). Reused by the scheduling, mileage, and
 * approval modals so the UI and split math stay consistent everywhere. The split
 * value is always the PAYER's portion (see src/lib/coverage.ts).
 */
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionTiles } from "@/pages/shared/client-management/components/forms/formControls";
import {
  COVERAGE,
  SPLIT_MODE,
  splitCharge,
  type Coverage,
  type SplitMode,
} from "@/lib/coverage";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";

export type CoverageFieldsValue = {
  coverage: Coverage;
  splitMode: SplitMode | null;
  splitValue: number | null;
};

const FIELD_CLASS = "h-[44px] rounded-[12px] border-[#cccccd] bg-white";

export function CoverageFields({
  value,
  onChange,
  previewCharge,
  disabled,
  className,
}: {
  value: CoverageFieldsValue;
  onChange: (next: CoverageFieldsValue) => void;
  /** When set, shows a live "Payer: $X · Out of pocket: $Y" preview for the both-split. */
  previewCharge?: number | null;
  disabled?: boolean;
  className?: string;
}) {
  const coverage = value.coverage ?? COVERAGE.PAYER;
  const splitMode = value.splitMode ?? SPLIT_MODE.PERCENTAGE;
  const isBoth = coverage === COVERAGE.BOTH;

  const setCoverage = (next: Coverage) =>
    onChange({
      coverage: next,
      splitMode: next === COVERAGE.BOTH ? splitMode : null,
      splitValue: next === COVERAGE.BOTH ? value.splitValue : null,
    });

  const preview =
    isBoth && previewCharge != null && previewCharge > 0
      ? splitCharge(previewCharge, coverage, splitMode, value.splitValue)
      : null;

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
        <OptionTiles<Coverage>
          value={coverage}
          options={[
            { value: COVERAGE.PAYER, label: "Payer / Insurance" },
            { value: COVERAGE.OUT_OF_POCKET, label: "Out of pocket" },
            { value: COVERAGE.BOTH, label: "Both" },
          ]}
          onChange={disabled ? () => {} : setCoverage}
          ariaLabel="Billing coverage"
        />
      </div>
      {isBoth && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Split type</label>
            <Select
              value={splitMode}
              onValueChange={(v) =>
                onChange({ ...value, coverage, splitMode: v as SplitMode })
              }
              disabled={disabled}
            >
              <SelectTrigger className={`${FIELD_CLASS} w-[160px]`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SPLIT_MODE.PERCENTAGE}>Percentage (%)</SelectItem>
                <SelectItem value={SPLIT_MODE.FLAT}>Flat amount ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              {splitMode === SPLIT_MODE.FLAT ? "Payer pays ($)" : "Payer covers (%)"}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={splitMode === SPLIT_MODE.FLAT ? undefined : 100}
              step="0.01"
              disabled={disabled}
              value={value.splitValue ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  coverage,
                  splitMode,
                  splitValue: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className={`${FIELD_CLASS} w-[140px]`}
              placeholder={splitMode === SPLIT_MODE.FLAT ? "0.00" : "0–100"}
            />
          </div>
        </div>
      )}
      {preview ? (
        <p className="text-[12px] font-medium text-[#10141a]">
          Payer: {formatCurrency(preview.payer)} · Out of pocket:{" "}
          {formatCurrency(preview.outOfPocket)}
        </p>
      ) : isBoth ? (
        <p className="text-[11px] text-[#808081]">
          The payer covers this
          {splitMode === SPLIT_MODE.FLAT ? " amount per service" : " percentage"}; the
          remainder is billed out of pocket.
        </p>
      ) : null}
    </div>
  );
}
