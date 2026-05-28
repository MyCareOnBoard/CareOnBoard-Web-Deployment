import BillingDateRangeModal from "../../components/BillingDateRangeModal";
import type { BillingDateRangeValues } from "../../components/types";

type ClaimsDateRangeModalProps = {
  open: boolean;
  onClose: () => void;
  values: BillingDateRangeValues;
  onChange: (values: BillingDateRangeValues) => void;
  onApply: (values: BillingDateRangeValues) => void;
  description?: string;
};

export default function ClaimsDateRangeModal({
  description = "Choose a date range to filter your claims dashboard",
  ...rest
}: ClaimsDateRangeModalProps) {
  return <BillingDateRangeModal {...rest} description={description} />;
}
