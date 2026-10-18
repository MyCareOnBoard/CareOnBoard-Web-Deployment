import { memo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CustomDatePicker from "@/components/ui/datePicker";
import ClaimReportSignatureField from "./ClaimReportSignatureField";
import type { ClaimReportFormState } from "../../data/mockClaimReportData";
import { ReportFieldLabel, ReportSectionTitle } from "../claimsModalShared";
import { CLAIM_REPORT_SIGNATURE_DATE_PICKER_PROPS } from "../claimsModalStyles";

type ClaimReportSummaryFooterProps = {
  form: ClaimReportFormState;
  claimId: string;
  onUpdate: (patch: Partial<ClaimReportFormState>) => void;
  onOpenPhysicianSignature: () => void;
  onClearPhysicianSignature: () => void;
};

function SummaryRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div className={cn("cr-summary-row", total && "cr-summary-row--total")}>
      <span className="cr-summary-label">{label}</span>
      <span className="cr-summary-value">{value}</span>
    </div>
  );
}

function ClaimReportSummaryFooter({
  form,
  claimId,
  onUpdate,
  onOpenPhysicianSignature,
  onClearPhysicianSignature,
}: ClaimReportSummaryFooterProps) {
  const signatureInputId = `report-physician-signature-${claimId}`;

  return (
    <div className="claim-report-print-section mt-6 space-y-6 border-t border-[#e5e5e6] pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="cr-signature-column">
          <ReportFieldLabel htmlFor={signatureInputId} className="cr-signature-label">
            Signature of physician or supplier
          </ReportFieldLabel>
          <ClaimReportSignatureField
            id={signatureInputId}
            value={form.physicianSignature}
            onOpen={onOpenPhysicianSignature}
            onClear={onClearPhysicianSignature}
          />
        </div>
        <div className="cr-signature-date-column">
          <ReportFieldLabel className="cr-signature-label">Signature date</ReportFieldLabel>
          <CustomDatePicker
            key={`report-signature-date-${claimId}`}
            align="end"
            date={form.signatureDateIso ? new Date(form.signatureDateIso) : null}
            placeholder="Select date"
            setDate={(date) =>
              onUpdate({ signatureDateIso: date ? format(date, "yyyy-MM-dd") : "" })
            }
            {...CLAIM_REPORT_SIGNATURE_DATE_PICKER_PROPS}
          />
        </div>
      </div>

      <div>
        <ReportSectionTitle>Summary</ReportSectionTitle>
        <SummaryRow
          label="Total Claims Processed"
          value={String(form.summary.totalClaimsProcessed)}
        />
        <SummaryRow label="Total Units Billed" value={form.summary.totalUnitsBilled} />
        <SummaryRow label="Total billed hours" value={form.summary.totalBilledHours} />
        <SummaryRow
          label="Total Claim Amount"
          value={form.summary.totalClaimAmount}
          total
        />
      </div>
    </div>
  );
}

export default memo(ClaimReportSummaryFooter);
