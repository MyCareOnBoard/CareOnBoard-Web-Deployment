import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServicePayType } from "@/pages/shared/client-management/types/formData";

const RATE_INPUT_CLASS = "h-[44px] rounded-[12px] border-[#cccccd] bg-white";
const SELECT_TRIGGER_CLASS = "w-[180px] h-[44px] rounded-[12px] border-[#cccccd] bg-white";

export type RatePayTypeFieldProps = {
  label: string;
  rate: string;
  payType?: ServicePayType;
  /** Include per-mile option (client and staff reimbursement). */
  includeMile?: boolean;
  onRateChange: (value: string) => void;
  onPayTypeChange: (value: ServicePayType) => void;
};

export function RatePayTypeField({
  label,
  rate,
  payType,
  includeMile = false,
  onRateChange,
  onPayTypeChange,
}: RatePayTypeFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={rate}
          onChange={(e) => onRateChange(e.target.value)}
          className={RATE_INPUT_CLASS}
          placeholder="Enter rate"
        />
        <Select value={payType} onValueChange={(v) => onPayTypeChange(v as ServicePayType)}>
          <SelectTrigger className={SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="Pay type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="15-min">15 minutes</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            {includeMile ? <SelectItem value="mile">Mile</SelectItem> : null}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
