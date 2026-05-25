import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getInitials } from "@/lib/utils/string-utils";
import type { ClaimReportFormState } from "../../data/mockClaimReportData";
import { BioRow, ReportRowLabel, ReportSectionTitle } from "../claimsModalShared";
import { CLAIM_REPORT_SECTION } from "../claimsModalStyles";

type ClaimReportLeftColumnProps = {
  form: ClaimReportFormState;
  onUpdate: (patch: Partial<ClaimReportFormState>) => void;
};

function ClaimReportLeftColumn({ form, onUpdate }: ClaimReportLeftColumnProps) {
  return (
    <div className="claim-report-print-section">
      <section>
        <ReportSectionTitle variant="muted">Client Bio data</ReportSectionTitle>

        <Avatar className="h-14 w-14 shrink-0 rounded-full">
          {form.clientAvatarUrl && (
            <AvatarImage
              src={form.clientAvatarUrl}
              alt={form.clientName}
              className="h-full w-full rounded-full object-cover"
            />
          )}
          <AvatarFallback className="rounded-full bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-sm font-medium text-white">
            {getInitials(form.clientName)}
          </AvatarFallback>
        </Avatar>
        <p className="mt-3 text-[16px] font-bold text-[var(--cr-title)]">{form.clientName}</p>

        <div className="mt-5 space-y-0.5">
          <BioRow label="Date of birth" value={form.dateOfBirth} />
          <BioRow label="Service code" value={form.serviceCode} />
          <BioRow
            label="Patient sex"
            value={<span className="cr-badge">{form.patientSex}</span>}
          />
        </div>
      </section>

      <section className={CLAIM_REPORT_SECTION}>
        <ReportSectionTitle>Patient location</ReportSectionTitle>
        <div className="space-y-0.5">
          <BioRow label="Patient address" value={form.patientAddress} emphasis={false} />
          <BioRow label="City" value={form.city} emphasis={false} />
          <BioRow label="State" value={form.state} emphasis={false} />
          <BioRow label="Zip code" value={form.zipCode} emphasis={false} />
        </div>
      </section>

      <section className={CLAIM_REPORT_SECTION} data-section="condition">
        <ReportSectionTitle>Is patient condition related</ReportSectionTitle>
        <div>
          <div className="flex items-center justify-between py-2">
            <ReportRowLabel>Employment</ReportRowLabel>
            <Checkbox
              checked={form.conditionEmployment}
              onChange={(event) => onUpdate({ conditionEmployment: event.target.checked })}
              aria-label="Employment"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <ReportRowLabel>Auto accident</ReportRowLabel>
            <Checkbox
              checked={form.conditionAutoAccident}
              onChange={(event) => onUpdate({ conditionAutoAccident: event.target.checked })}
              aria-label="Auto accident"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <ReportRowLabel>Auto Other accident</ReportRowLabel>
            <Checkbox
              checked={form.conditionOtherAccident}
              onChange={(event) => onUpdate({ conditionOtherAccident: event.target.checked })}
              aria-label="Auto Other accident"
            />
          </div>
        </div>
      </section>

      <section className={CLAIM_REPORT_SECTION} data-section="outside-lab">
        <div className="flex items-center justify-between gap-4">
          <ReportSectionTitle className="!mb-0">Outside the lab?</ReportSectionTitle>
          <RadioGroup
            value={form.outsideLab}
            onValueChange={(value) => onUpdate({ outsideLab: value as "yes" | "no" })}
            className="flex shrink-0 gap-4"
          >
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="yes" />
              <span className="text-[13px] font-normal text-[var(--cr-title)]">Yes</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="no" />
              <span className="text-[13px] font-normal text-[var(--cr-title)]">No</span>
            </label>
          </RadioGroup>
        </div>
      </section>
    </div>
  );
}

export default memo(ClaimReportLeftColumn);
