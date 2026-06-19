import React, { useId } from "react";
import { format, isValid, parse } from "date-fns";
import { Plus, X } from "lucide-react";
import type { Form485Document } from "../types/clientForm485Generation";
import {
  DatePickerField,
  FieldLabel,
  FormSection,
  LineInput,
  LineTextArea,
  OptionTiles,
} from "./forms/formControls";
import { AddressAutocompleteField } from "./forms/AddressAutocompleteField";

/**
 * Interactive, editable CMS-485 (Form 485) form rendered after AI generation.
 * Prefilled from the generated `Form485Document` and grouped by CMS-485 box order.
 * Lives behind the "Edit form" tab of GenerateForm485Panel; the "Preview" tab and
 * the off-screen PDF capture render the same edited values via Form485PrintTemplate.
 *
 * Colors are explicit hex (consistent with formControls) so values typed here read
 * cleanly when the print template is snapshotted to PDF.
 */

const GRID_2 = "grid grid-cols-1 gap-4 sm:grid-cols-2";
const GRID_3 = "grid grid-cols-1 gap-4 sm:grid-cols-3";

const SEX_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
] as const;

/* Small labeled-field wrappers (module-level so they aren't re-created each render). */

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <LineInput id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function AreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <LineTextArea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ChoiceField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <OptionTiles
        ariaLabel={label}
        value={value}
        options={options as Array<{ value: string; label: string }>}
        onChange={onChange}
      />
    </div>
  );
}

const DATE_FORMAT = "MM/dd/yyyy";

/** Parse a stored MM/DD/YYYY string into a Date for the calendar; invalid/empty -> undefined. */
function parseFormDate(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = parse(trimmed, DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

/** Calendar date field (same picker as the Clinical Assessment form) that stores MM/DD/YYYY. */
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <DatePickerField
      id={id}
      label={label}
      value={parseFormDate(value)}
      onChange={(d) => onChange(d ? format(d, DATE_FORMAT) : "")}
    />
  );
}

/** Address field with Google Places autocomplete (same as the Clinical Assessment form). */
function AddressField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return <AddressAutocompleteField id={id} label={label} value={value} onChange={onChange} />;
}

/**
 * One-item-per-line textarea for the "simple" CMS-485 array boxes (diagnoses,
 * functional limitations, activities, mental status). We store `split("\n")`
 * WITHOUT trimming/filtering so the user's blank lines and cursor are never
 * fought mid-type; the print template's `Lines` helper trims + drops blanks at
 * render/export, so empties never reach the PDF.
 */
function ListTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <LineTextArea
        id={id}
        rows={Math.max(3, value.length + 1)}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        placeholder={placeholder}
      />
      <span className="text-[11px] text-[#808081]">One per line.</span>
    </div>
  );
}

/**
 * Add/remove rows for `medications` (box 10). Each medication is its own input
 * with a delete button, plus one global "Add medication" button. Empty rows are
 * kept in state while editing and filtered out for the PDF by the print template.
 */
function MedicationRows({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const update = (index: number, next: string) =>
    onChange(value.map((m, i) => (i === index ? next : m)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, ""]);

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Medications</FieldLabel>
      {value.length === 0 ? (
        <p className="text-[12px] text-[#808081]">No medications. Add one below.</p>
      ) : (
        value.map((med, i) => (
          <div key={i} className="flex items-center gap-2">
            <LineInput
              value={med}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Name Dose / Frequency / Route (N)ew or (C)hanged"
            />
            <button
              type="button"
              aria-label={`Remove medication ${i + 1}`}
              onClick={() => remove(i)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[#cccccd] text-[#808081] transition-colors hover:border-[#d53411]/60 hover:text-[#d53411]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit items-center gap-1.5 rounded-[10px] border border-[#00b4b8] px-3 py-2 text-[13px] font-medium text-[#00b4b8] transition-colors hover:bg-[#e6fafa]"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add medication
      </button>
    </div>
  );
}

export default function Form485EditForm({
  value,
  setField,
}: {
  value: Form485Document;
  setField: <K extends keyof Form485Document>(key: K, next: Form485Document[K]) => void;
}) {
  const v = value;
  return (
    <div className="space-y-4">
      <FormSection title="Patient & Provider">
        <div className="space-y-4">
          <div className={GRID_2}>
            <TextField
              label="HI Claim No."
              value={v.patientHiClaimNo}
              onChange={(next) => setField("patientHiClaimNo", next)}
            />
            <TextField
              label="Medical Record No."
              value={v.medicalRecordNo}
              onChange={(next) => setField("medicalRecordNo", next)}
            />
          </div>
          <div className={GRID_2}>
            <TextField
              label="Provider No."
              value={v.providerNo}
              onChange={(next) => setField("providerNo", next)}
            />
            <DateField
              label="Date of Birth"
              value={v.dateOfBirth}
              onChange={(next) => setField("dateOfBirth", next)}
            />
          </div>
          <TextField
            label="Patient Name"
            value={v.patientName}
            onChange={(next) => setField("patientName", next)}
          />
          <AddressField
            label="Patient Address"
            value={v.patientAddress}
            onChange={(next) => setField("patientAddress", next)}
          />
          <TextField
            label="Provider Name"
            value={v.providerName}
            onChange={(next) => setField("providerName", next)}
          />
          <div className={GRID_2}>
            <AddressField
              label="Provider Address"
              value={v.providerAddress}
              onChange={(next) => setField("providerAddress", next)}
            />
            <TextField
              label="Provider Phone"
              value={v.providerPhone}
              onChange={(next) => setField("providerPhone", next)}
            />
          </div>
          <ChoiceField
            label="Sex"
            value={v.sex}
            options={SEX_OPTIONS}
            onChange={(next) => setField("sex", next)}
          />
        </div>
      </FormSection>

      <FormSection title="Certification & Dates">
        <div className={GRID_3}>
          <DateField
            label="Start of Care Date"
            value={v.startOfCareDate}
            onChange={(next) => setField("startOfCareDate", next)}
          />
          <DateField
            label="Certification Period From"
            value={v.certificationPeriodFrom}
            onChange={(next) => setField("certificationPeriodFrom", next)}
          />
          <DateField
            label="Certification Period To"
            value={v.certificationPeriodTo}
            onChange={(next) => setField("certificationPeriodTo", next)}
          />
        </div>
      </FormSection>

      <FormSection title="Diagnoses & Procedures">
        <div className="space-y-4">
          <div className={GRID_2}>
            <TextField
              label="Principal Diagnosis"
              value={v.principalDiagnosis}
              onChange={(next) => setField("principalDiagnosis", next)}
            />
            <DateField
              label="Principal Diagnosis Date"
              value={v.principalDiagnosisDate}
              onChange={(next) => setField("principalDiagnosisDate", next)}
            />
          </div>
          <div className={GRID_2}>
            <TextField
              label="Surgical Procedure"
              value={v.surgicalProcedure}
              onChange={(next) => setField("surgicalProcedure", next)}
            />
            <DateField
              label="Surgical Procedure Date"
              value={v.surgicalProcedureDate}
              onChange={(next) => setField("surgicalProcedureDate", next)}
            />
          </div>
          <ListTextField
            label="Other Diagnoses"
            value={v.otherDiagnoses}
            onChange={(next) => setField("otherDiagnoses", next)}
            placeholder="ICD CODE DESCRIPTION — DATE"
          />
        </div>
      </FormSection>

      <FormSection title="Medications">
        <MedicationRows value={v.medications} onChange={(next) => setField("medications", next)} />
      </FormSection>

      <FormSection title="Clinical">
        <div className="space-y-4">
          <div className={GRID_2}>
            <AreaField
              label="DME & Supplies"
              value={v.dmeAndSupplies}
              onChange={(next) => setField("dmeAndSupplies", next)}
            />
            <AreaField
              label="Safety Measures"
              value={v.safetyMeasures}
              onChange={(next) => setField("safetyMeasures", next)}
            />
          </div>
          <div className={GRID_2}>
            <AreaField
              label="Nutritional Requirements"
              value={v.nutritionalRequirements}
              onChange={(next) => setField("nutritionalRequirements", next)}
            />
            <AreaField
              label="Allergies"
              value={v.allergies}
              onChange={(next) => setField("allergies", next)}
            />
          </div>
          <TextField
            label="Prognosis"
            value={v.prognosis}
            onChange={(next) => setField("prognosis", next)}
          />
        </div>
      </FormSection>

      <FormSection title="Functional / Activities / Mental Status">
        <div className="space-y-4">
          <div className={GRID_2}>
            <ListTextField
              label="Functional Limitations"
              value={v.functionalLimitations}
              onChange={(next) => setField("functionalLimitations", next)}
              placeholder="e.g. Amputation"
            />
            <ListTextField
              label="Activities Permitted"
              value={v.activitiesPermitted}
              onChange={(next) => setField("activitiesPermitted", next)}
              placeholder="e.g. Partial Weight Bearing"
            />
          </div>
          <ListTextField
            label="Mental Status"
            value={v.mentalStatus}
            onChange={(next) => setField("mentalStatus", next)}
            placeholder="e.g. Oriented"
          />
        </div>
      </FormSection>

      <FormSection title="Orders & Goals">
        <div className="space-y-4">
          <AreaField
            label="Orders for Discipline & Treatments"
            value={v.ordersForDisciplineAndTreatments}
            onChange={(next) => setField("ordersForDisciplineAndTreatments", next)}
            rows={4}
          />
          <AreaField
            label="Goals / Rehab Potential / Discharge Plans"
            value={v.goalsRehabPotentialDischargePlans}
            onChange={(next) => setField("goalsRehabPotentialDischargePlans", next)}
            rows={4}
          />
        </div>
      </FormSection>

      <FormSection title="Signatures">
        <div className="space-y-4">
          <div className={GRID_2}>
            <TextField
              label="Nurse Signature"
              value={v.nurseSignature}
              onChange={(next) => setField("nurseSignature", next)}
            />
            <DateField
              label="Verbal SOC Date"
              value={v.verbalSocDate}
              onChange={(next) => setField("verbalSocDate", next)}
            />
          </div>
          <TextField
            label="Physician Name"
            value={v.physicianName}
            onChange={(next) => setField("physicianName", next)}
          />
          <AddressField
            label="Physician Address"
            value={v.physicianAddress}
            onChange={(next) => setField("physicianAddress", next)}
          />
          <DateField
            label="Date HHA Received Signed POT"
            value={v.dateHhaReceivedSignedPot}
            onChange={(next) => setField("dateHhaReceivedSignedPot", next)}
          />
          <div className={GRID_2}>
            <TextField
              label="Attending Physician Signature"
              value={v.attendingPhysicianSignature}
              onChange={(next) => setField("attendingPhysicianSignature", next)}
            />
            <DateField
              label="Attending Physician Signature Date"
              value={v.attendingPhysicianSignatureDate}
              onChange={(next) => setField("attendingPhysicianSignatureDate", next)}
            />
          </div>
        </div>
      </FormSection>
    </div>
  );
}
