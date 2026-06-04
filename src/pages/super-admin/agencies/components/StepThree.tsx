import React from "react";
import OperationalSettingsFields from "@/pages/shared/agency/OperationalSettingsFields";
import type { OperationalFormSlice } from "@/lib/agency/operational-settings";

type Step5OperationalProps = {
  formData: OperationalFormSlice;
  onChange: (field: keyof OperationalFormSlice, value: OperationalFormSlice[keyof OperationalFormSlice]) => void;
  fieldsWithErrors?: string[];
};

export default function Step5Operational({
  formData,
  onChange,
  fieldsWithErrors = [],
}: Step5OperationalProps) {
  return (
    <OperationalSettingsFields
      values={formData}
      onChange={onChange}
      fieldsWithErrors={fieldsWithErrors}
      variant="grid"
    />
  );
}
