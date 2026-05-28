import BillingDateRangeModal from "../../components/BillingDateRangeModal";
import type { BillingDateRangeValues } from "../../components/types";

type ClaimsDateRangeModalProps = {
  open: boolean;
  onClose: () => void;
  values: BillingDateRangeValues;
  onChange: (values: BillingDateRangeValues) => void;
  onApply: (values: BillingDateRangeValues) => void;
};

export default function ClaimsDateRangeModal(props: ClaimsDateRangeModalProps) {
  return (
    <BillingDateRangeModal
      {...props}
      description="Choose a date range to filter your claims dashboard"
    />
  );
}
