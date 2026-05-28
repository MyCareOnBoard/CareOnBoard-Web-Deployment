import { memo } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/datePicker";
import ClaimReportSignatureField from "./ClaimReportSignatureField";
import {
  CLAIM_REPORT_AGREEMENT_TEXT,
  DIAGNOSIS_CODE_LETTERS,
  type ClaimReportFormState,
} from "../../data/mockClaimReportData";
import { ReportFieldLabel, ReportSectionTitle } from "../claimsModalShared";
import {
  CLAIM_REPORT_DATE_PICKER_PROPS,
  CLAIM_REPORT_FIELD_CLASS,
  CLAIM_REPORT_SECTION,
} from "../claimsModalStyles";

type ClaimReportAgreementPanelProps = {
  form: ClaimReportFormState;
  claimId: string;
  onUpdate: (patch: Partial<ClaimReportFormState>) => void;
  onUpdateDiagnosis: (letter: string, value: string) => void;
  onOpenSignedSignature: () => void;
  onClearSignedSignature: () => void;
};

function ClaimReportAgreementPanel({
  form,
  claimId,
  onUpdate,
  onUpdateDiagnosis,
  onOpenSignedSignature,
  onClearSignedSignature,
}: ClaimReportAgreementPanelProps) {
  const setDateField =
    (field: keyof ClaimReportFormState) => (date: Date | null) => {
      onUpdate({ [field]: date ? format(date, "yyyy-MM-dd") : "" });
    };

  return (
    <div className="claim-report-print-section">
      <section>
        <ReportSectionTitle>Agreement</ReportSectionTitle>
        <div className="cr-agreement-box">{CLAIM_REPORT_AGREEMENT_TEXT}</div>
      </section>

      <section className={CLAIM_REPORT_SECTION}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ReportFieldLabel>Service date</ReportFieldLabel>
            <CustomDatePicker
              key={`report-service-date-${claimId}`}
              align="start"
              date={form.serviceDateIso ? new Date(form.serviceDateIso) : null}
              placeholder="Select service date"
              setDate={setDateField("serviceDateIso")}
              {...CLAIM_REPORT_DATE_PICKER_PROPS}
            />
          </div>
          <div>
            <ReportFieldLabel htmlFor={`report-signed-${claimId}`}>Signed</ReportFieldLabel>
            <ClaimReportSignatureField
              id={`report-signed-${claimId}`}
              value={form.signedSignature}
              onOpen={onOpenSignedSignature}
              onClear={onClearSignedSignature}
            />
          </div>
        </div>
      </section>

      <section className={CLAIM_REPORT_SECTION}>
        <ReportSectionTitle>Diagnosis of illness</ReportSectionTitle>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {DIAGNOSIS_CODE_LETTERS.map((letter) => (
            <div key={letter}>
              <ReportFieldLabel>{letter} Code</ReportFieldLabel>
              <Input
                value={form.diagnosisCodes[letter] ?? ""}
                onChange={(event) => onUpdateDiagnosis(letter, event.target.value)}
                className={`${CLAIM_REPORT_FIELD_CLASS} h-[40px] text-[13px]`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={CLAIM_REPORT_SECTION}>
        <ReportSectionTitle>Hospitalization date released to current service</ReportSectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ReportFieldLabel>Initial date</ReportFieldLabel>
            <CustomDatePicker
              key={`report-hosp-initial-${claimId}`}
              align="start"
              date={
                form.hospitalizationInitialIso ? new Date(form.hospitalizationInitialIso) : null
              }
              placeholder="Today"
              setDate={setDateField("hospitalizationInitialIso")}
              {...CLAIM_REPORT_DATE_PICKER_PROPS}
            />
          </div>
          <div>
            <ReportFieldLabel>End date</ReportFieldLabel>
            <CustomDatePicker
              key={`report-hosp-end-${claimId}`}
              align="end"
              date={form.hospitalizationEndIso ? new Date(form.hospitalizationEndIso) : null}
              placeholder="Select end date"
              setDate={setDateField("hospitalizationEndIso")}
              {...CLAIM_REPORT_DATE_PICKER_PROPS}
            />
          </div>
        </div>
      </section>

      <section className={CLAIM_REPORT_SECTION}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ReportFieldLabel>Charges</ReportFieldLabel>
            <div className="flex h-[48px] overflow-hidden rounded-[10px] border border-[#e5e5e6] bg-white">
              <Select
                value={form.chargesCurrency}
                onValueChange={(chargesCurrency) => onUpdate({ chargesCurrency })}
              >
                <SelectTrigger className="h-full w-[88px] shrink-0 rounded-none border-0 border-r border-[#e5e5e6] bg-transparent px-3 text-[var(--cr-title)] shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={form.chargesAmount}
                onChange={(event) => onUpdate({ chargesAmount: event.target.value })}
                placeholder="0.00"
                className="cr-field h-full flex-1 rounded-none border-0 bg-transparent px-4 text-[14px] shadow-none placeholder:text-[var(--cr-placeholder)] focus-visible:ring-0"
              />
            </div>
          </div>
          <div>
            <ReportFieldLabel htmlFor={`report-pa-number-${claimId}`}>
              Prior authorization number
            </ReportFieldLabel>
            <Input
              id={`report-pa-number-${claimId}`}
              value={form.paNumber}
              onChange={(event) => onUpdate({ paNumber: event.target.value })}
              placeholder="Enter PA number"
              className={CLAIM_REPORT_FIELD_CLASS}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default memo(ClaimReportAgreementPanel);
