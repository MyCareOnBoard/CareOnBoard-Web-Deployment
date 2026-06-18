import React, { lazy, Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Download, FileCheck2, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { AddClientFormData } from "../types/formData";
import {
  CA_ADL_ACTIVITIES,
  CA_ASSESSMENT_STATUSES,
  CA_ASSESSMENT_TYPES,
  CA_ASSESSOR_DISCIPLINES,
  CA_DME_ITEMS,
  CA_HHA_ASSISTANCE,
  CA_PAIN_LEVELS,
  CA_RISK_LEVELS,
  CA_SKILLED_NURSING_REASONS,
  CA_THERAPY_SERVICES,
  buildClinicalAssessmentFileName,
  createEmptyCaMedication,
  createEmptyClinicalAssessmentForm,
  type CaAssessmentStatus,
  type CaAssessmentType,
  type CaAssessorDiscipline,
  type CaLivingSituation,
  type CaMedication,
  type CaOption,
  type CaRiskLevel,
  type CaSignatureType,
  type CaSkinCondition,
  type ClinicalAssessmentFormData,
} from "../types/clinicalAssessment";
import { generateFormPdfBlob } from "../utils/generateFormPdfBlob";
import { downloadPocPdfFromBlob } from "../utils/generatePocPdf";
import { attachImportFileToDoc } from "../utils/attachImportFileToDoc";
import ClinicalAssessmentPrintTemplate from "./ClinicalAssessmentPrintTemplate";
import {
  CheckTile,
  DatePickerField,
  FieldLabel,
  FormSection,
  LineInput,
  LineTextArea,
  OptionTiles,
  SegmentedToggle,
  SignatureField,
} from "./forms/formControls";
import { AddressAutocompleteField } from "./forms/AddressAutocompleteField";
import { normalizeSignaturePayload } from "@/pages/agency/billing/claims/utils/claimReportSignatureUtils";

const DigitalSignatureModal = lazy(
  () => import("@/pages/applicant/application/components/DigitalSignature"),
);

const YES_NO_OPTIONS: Array<{ value: "yes" | "no"; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const SKIN_OPTIONS: CaOption[] = [
  { value: "normal", label: "Normal" },
  { value: "abnormal", label: "Abnormal" },
];
const LIVING_OPTIONS: CaOption[] = [
  { value: "alone", label: "Lives Alone" },
  { value: "withFamily", label: "Lives With Family" },
];

const GRID_2 = "grid grid-cols-1 gap-4 sm:grid-cols-2";
const GRID_3 = "grid grid-cols-1 gap-4 sm:grid-cols-3";

function clientNameFromWizard(fd: AddClientFormData): string {
  return [fd.stage1.firstName, fd.stage1.middleName, fd.stage1.lastName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Core fields that must be filled before the assessment can be saved to the
 * client. Each entry maps a user-facing label to a predicate over the form
 * state, so the "Use as Clinical Assessment" action can report exactly what is
 * still missing.
 */
const CA_REQUIRED_FIELDS: Array<{
  label: string;
  id: string;
  filled: (ca: ClinicalAssessmentFormData) => boolean;
}> = [
  { label: "Assessment Date", id: "ca-assessment-date", filled: (ca) => !!ca.assessmentDate },
  { label: "Assessment Type", id: "ca-assessment-type", filled: (ca) => !!ca.assessmentType },
  { label: "Assessor Name", id: "ca-assessor-name", filled: (ca) => ca.assessorName.trim() !== "" },
  { label: "Assessor Discipline", id: "ca-assessor-discipline", filled: (ca) => !!ca.assessorDiscipline },
  { label: "Location of Assessment", id: "ca-assessment-location", filled: (ca) => ca.locationOfAssessment.trim() !== "" },
  { label: "Primary Diagnosis", id: "ca-primary-diagnosis", filled: (ca) => ca.primaryDiagnosis.trim() !== "" },
  { label: "Assessor Name (Approval)", id: "ca-approval-assessor-name", filled: (ca) => ca.approvalAssessorName.trim() !== "" },
  { label: "Nurse Signature", id: "ca-nurse-signature", filled: (ca) => ca.nurseSignature.trim() !== "" },
  { label: "Completion Date", id: "ca-completion-date", filled: (ca) => !!ca.assessmentCompletionDate },
  { label: "Assessment Status", id: "ca-assessment-status", filled: (ca) => !!ca.assessmentStatus },
];

function getMissingClinicalAssessmentFields(
  ca: ClinicalAssessmentFormData,
): Array<{ label: string; id: string }> {
  return CA_REQUIRED_FIELDS.filter((f) => !f.filled(ca)).map((f) => ({ label: f.label, id: f.id }));
}

/* Small labeled-field wrappers (module-level so they aren't re-created each render). */

function TextField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <LineInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-required={required || undefined}
      />
    </div>
  );
}

function AreaField({
  label,
  id,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <LineTextArea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "" | "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <SegmentedToggle ariaLabel={label} value={value} options={YES_NO_OPTIONS} onChange={onChange} />
    </div>
  );
}

function ChoiceField({
  label,
  value,
  options,
  onChange,
  id,
  required,
}: {
  label: string;
  value: string;
  options: CaOption[];
  onChange: (v: string) => void;
  id?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <OptionTiles
        id={id}
        required={required}
        ariaLabel={label}
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  );
}

export default function ClinicalAssessmentFormModal({
  open,
  onOpenChange,
  formData,
  setFormData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const [ca, setCa] = useState<ClinicalAssessmentFormData>(() =>
    createEmptyClinicalAssessmentForm(),
  );
  const caRef = useRef(ca);
  caRef.current = ca;

  // The off-screen print template only needs to be current at export time. Defer it
  // so typing in the form doesn't reconcile the heavy paper template on every keystroke.
  const deferredCa = useDeferredValue(ca);

  const [busy, setBusy] = useState<null | "download" | "apply">(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureModalEverOpened, setSignatureModalEverOpened] = useState(false);

  // Hydrate from the saved draft on open (so closing/reopening keeps entries),
  // then non-destructively prefill identity fields from the wizard.
  useEffect(() => {
    if (!open) return;
    const fd = formDataRef.current;
    const base = fd.clinicalAssessmentDraft ?? createEmptyClinicalAssessmentForm();
    setCa({
      ...base,
      primaryDiagnosis: base.primaryDiagnosis || (fd.stage3.diagnosis ?? ""),
      drugAllergies: base.drugAllergies || (fd.stage3.allergies ?? []).join(", "),
    });
  }, [open]);

  // Persist the draft on every close path, then forward to the parent.
  const closeModal = useCallback(
    (next: boolean) => {
      if (!next) {
        setFormData((prev) => ({ ...prev, clinicalAssessmentDraft: caRef.current }));
      }
      onOpenChange(next);
    },
    [onOpenChange, setFormData],
  );

  const setField = useCallback(
    <K extends keyof ClinicalAssessmentFormData>(key: K, value: ClinicalAssessmentFormData[K]) =>
      setCa((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const setAdl = useCallback(
    (id: string, value: string) =>
      setCa((prev) => ({ ...prev, adl: { ...prev.adl, [id]: value } })),
    [],
  );
  const toggleRecord = useCallback(
    (
      group: "dme" | "skilledNursingReasons" | "homeHealthAideAssistance" | "therapyServices",
      id: string,
      next: boolean,
    ) =>
      setCa((prev) => ({ ...prev, [group]: { ...prev[group], [id]: next } })),
    [],
  );
  const addMedication = useCallback(
    () => setCa((prev) => ({ ...prev, medications: [...prev.medications, createEmptyCaMedication()] })),
    [],
  );
  const removeMedication = useCallback(
    (id: string) =>
      setCa((prev) => ({ ...prev, medications: prev.medications.filter((m) => m.id !== id) })),
    [],
  );
  const updateMedication = useCallback(
    (id: string, patch: Partial<CaMedication>) =>
      setCa((prev) => ({
        ...prev,
        medications: prev.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),
    [],
  );

  const generate = useCallback(
    async (mode: "download" | "apply") => {
      if (!printRef.current) return;
      // Saving to the client requires the core fields; downloading a draft does not.
      if (mode === "apply") {
        const missing = getMissingClinicalAssessmentFields(caRef.current);
        if (missing.length > 0) {
          const shown = missing.slice(0, 4).map((f) => f.label).join(", ");
          const extra = missing.length > 4 ? ` and ${missing.length - 4} more` : "";
          toast({
            title: "Complete the required fields",
            description: `Please fill in: ${shown}${extra}.`,
            variant: "destructive",
          });
          // Reveal the first missing field so the user isn't hunting through 16 sections.
          const first = document.getElementById(missing[0].id);
          if (first) {
            first.scrollIntoView({ behavior: "smooth", block: "center" });
            first.focus({ preventScroll: true });
          }
          return;
        }
      }
      setBusy(mode);
      try {
        const blob = await generateFormPdfBlob(printRef.current, { paged: true });
        const fileName = buildClinicalAssessmentFileName(clientNameFromWizard(formDataRef.current));
        if (mode === "download") {
          downloadPocPdfFromBlob(blob, fileName);
          toast({
            title: "Clinical Assessment downloaded",
            description: fileName,
            variant: "success",
          });
        } else {
          const file = new File([blob], fileName, { type: "application/pdf" });
          setFormData((prev) => attachImportFileToDoc(prev, "clinicalAssessment", file));
          toast({
            title: "Saved to client",
            description: "Attached as the Clinical Assessment document in step 3.",
            variant: "success",
          });
          closeModal(false);
        }
      } catch {
        toast({
          title: "Couldn't generate the PDF",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [toast, setFormData, closeModal],
  );

  const openSignature = useCallback(() => {
    setSignatureModalEverOpened(true);
    setSignatureOpen(true);
  }, []);

  const handleSignatureSave = useCallback(
    async (payload: { signatureType: string; signatureData: string }) => {
      const sigType = payload.signatureType as CaSignatureType;
      const normalized = await normalizeSignaturePayload({
        signatureType: sigType,
        signatureData: payload.signatureData,
      });
      setCa((prev) => ({
        ...prev,
        nurseSignature: normalized.signatureData,
        nurseSignatureType: sigType,
      }));
      setSignatureOpen(false);
    },
    [],
  );

  // Interacting with the signature modal must not close the assessment dialog.
  const blockCloseWhileSigning = useCallback((event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("[data-signature-modal]")) {
      event.preventDefault();
    }
  }, []);

  return (
    <>
      <Dialog
        open={open}
        modal={!signatureOpen}
        onOpenChange={(value) => {
          // Keep open while the signature sub-modal is up, and don't allow closing
          // mid-export (an in-flight "apply" would otherwise still attach the PDF).
          if (!value && (signatureOpen || busy)) return;
          closeModal(value);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[94vh] w-[min(98vw,960px)] flex-col overflow-hidden p-0"
          onPointerDownOutside={blockCloseWhileSigning}
          onInteractOutside={blockCloseWhileSigning}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e6e7e8] px-5 py-4">
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg font-semibold leading-snug text-[#10141a]">
                Home Health Clinical Assessment
              </DialogTitle>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Fill in on site, then download as a PDF or attach it as the client's Clinical Assessment.
              </p>
            </div>
            <DialogClose
              aria-label="Close"
              className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5c6368] transition-colors hover:bg-[#e6e7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/40"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogClose>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-5 bg-white">
              {/* 1. Assessment Information */}
              <FormSection title="Section 1 · Assessment Information">
                <div className="flex flex-col gap-4">
                  <div className={GRID_2}>
                    <DatePickerField
                      id="ca-assessment-date"
                      label="Assessment Date"
                      required
                      value={ca.assessmentDate}
                      onChange={(d) => setField("assessmentDate", d)}
                    />
                    <TextField
                      label="Assessor Name"
                      id="ca-assessor-name"
                      required
                      value={ca.assessorName}
                      onChange={(v) => setField("assessorName", v)}
                    />
                  </div>
                  <ChoiceField
                    id="ca-assessment-type"
                    label="Assessment Type"
                    required
                    value={ca.assessmentType}
                    options={CA_ASSESSMENT_TYPES}
                    onChange={(v) => setField("assessmentType", v as CaAssessmentType)}
                  />
                  <ChoiceField
                    id="ca-assessor-discipline"
                    label="Assessor Discipline"
                    required
                    value={ca.assessorDiscipline}
                    options={CA_ASSESSOR_DISCIPLINES}
                    onChange={(v) => setField("assessorDiscipline", v as CaAssessorDiscipline)}
                  />
                  <div className={GRID_2}>
                    <AddressAutocompleteField
                      id="ca-assessment-location"
                      label="Location of Assessment"
                      required
                      value={ca.locationOfAssessment}
                      onChange={(v) => setField("locationOfAssessment", v)}
                    />
                  </div>
                  <AreaField
                    label="Referral Reason"
                    value={ca.referralReason}
                    onChange={(v) => setField("referralReason", v)}
                  />
                </div>
              </FormSection>

              {/* 2. Medical History */}
              <FormSection title="Section 2 · Medical History">
                <div className="flex flex-col gap-4">
                  <TextField
                    id="ca-primary-diagnosis"
                    label="Primary Diagnosis"
                    required
                    value={ca.primaryDiagnosis}
                    onChange={(v) => setField("primaryDiagnosis", v)}
                  />
                  <div className={GRID_2}>
                    <AreaField
                      label="Secondary Diagnoses"
                      value={ca.secondaryDiagnoses}
                      onChange={(v) => setField("secondaryDiagnoses", v)}
                    />
                    <AreaField
                      label="Past Medical History"
                      value={ca.pastMedicalHistory}
                      onChange={(v) => setField("pastMedicalHistory", v)}
                    />
                    <AreaField
                      label="Previous Surgeries"
                      value={ca.previousSurgeries}
                      onChange={(v) => setField("previousSurgeries", v)}
                    />
                    <AreaField
                      label="Recent Hospitalizations"
                      value={ca.recentHospitalizations}
                      onChange={(v) => setField("recentHospitalizations", v)}
                    />
                    <AreaField
                      label="Emergency Room Visits"
                      value={ca.emergencyRoomVisits}
                      onChange={(v) => setField("emergencyRoomVisits", v)}
                    />
                    <AreaField
                      label="Chronic Conditions"
                      value={ca.chronicConditions}
                      onChange={(v) => setField("chronicConditions", v)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* 3. Vital Signs & Physical Health */}
              <FormSection title="Section 3 · Vital Signs & Physical Health">
                <div className="flex flex-col gap-4">
                  <div className={GRID_3}>
                    <TextField label="Blood Pressure" value={ca.bloodPressure} onChange={(v) => setField("bloodPressure", v)} placeholder="e.g. 120/80" />
                    <TextField label="Heart Rate" value={ca.heartRate} onChange={(v) => setField("heartRate", v)} placeholder="bpm" />
                    <TextField label="Respiratory Rate" value={ca.respiratoryRate} onChange={(v) => setField("respiratoryRate", v)} placeholder="rpm" />
                    <TextField label="Temperature" value={ca.temperature} onChange={(v) => setField("temperature", v)} placeholder="°F" />
                    <TextField label="Oxygen Saturation" value={ca.oxygenSaturation} onChange={(v) => setField("oxygenSaturation", v)} placeholder="%" />
                    <TextField label="Weight" value={ca.weight} onChange={(v) => setField("weight", v)} />
                    <TextField label="Height" value={ca.height} onChange={(v) => setField("height", v)} />
                    <TextField label="BMI" value={ca.bmi} onChange={(v) => setField("bmi", v)} />
                  </div>
                  <ChoiceField
                    label="Pain Level (0–10)"
                    value={ca.painLevel}
                    options={CA_PAIN_LEVELS}
                    onChange={(v) => setField("painLevel", v)}
                  />
                </div>
              </FormSection>

              {/* 4. Medication Assessment */}
              <FormSection title="Section 4 · Medication Assessment">
                <div className="flex flex-col gap-4">
                  {ca.medications.length === 0 ? (
                    <p className="text-[13px] text-[#5c6368]">No medications added yet.</p>
                  ) : (
                    ca.medications.map((m, index) => (
                      <div key={m.id} className="rounded-[10px] border border-[#e2e4e6] bg-[#f8fafb] p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-[#10141a]">{`Medication ${index + 1}`}</span>
                          <button
                            type="button"
                            aria-label={`Remove medication ${index + 1}`}
                            onClick={() => removeMedication(m.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#b4322e] transition-colors hover:bg-[#fbeae9]"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <div className="flex flex-col gap-4">
                          <div className={GRID_3}>
                            <TextField label="Name" value={m.name} onChange={(v) => updateMedication(m.id, { name: v })} />
                            <TextField label="Dosage" value={m.dosage} onChange={(v) => updateMedication(m.id, { dosage: v })} />
                            <TextField label="Route" value={m.route} onChange={(v) => updateMedication(m.id, { route: v })} />
                            <TextField label="Frequency" value={m.frequency} onChange={(v) => updateMedication(m.id, { frequency: v })} />
                            <TextField label="Purpose" value={m.purpose} onChange={(v) => updateMedication(m.id, { purpose: v })} />
                            <TextField label="Prescribing Physician" value={m.prescribingPhysician} onChange={(v) => updateMedication(m.id, { prescribingPhysician: v })} />
                          </div>
                          <div className={GRID_2}>
                            <TextField label="Medication Compliance" value={m.compliance} onChange={(v) => updateMedication(m.id, { compliance: v })} />
                            <TextField label="Side Effects Noted" value={m.sideEffects} onChange={(v) => updateMedication(m.id, { sideEffects: v })} />
                          </div>
                          <YesNoField
                            label="Medication Management Required"
                            value={m.managementRequired}
                            onChange={(v) => updateMedication(m.id, { managementRequired: v })}
                          />
                        </div>
                      </div>
                    ))
                  )}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 border-[#00b4b8] text-[#00b4b8] hover:bg-[#e6fafa]"
                      onClick={addMedication}
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden />
                      Add medication
                    </Button>
                  </div>
                </div>
              </FormSection>

              {/* 5. Allergy Assessment */}
              <FormSection title="Section 5 · Allergy Assessment">
                <div className={GRID_2}>
                  <TextField label="Drug Allergies" value={ca.drugAllergies} onChange={(v) => setField("drugAllergies", v)} />
                  <TextField label="Food Allergies" value={ca.foodAllergies} onChange={(v) => setField("foodAllergies", v)} />
                  <TextField label="Environmental Allergies" value={ca.environmentalAllergies} onChange={(v) => setField("environmentalAllergies", v)} />
                  <TextField label="Reaction Type" value={ca.reactionType} onChange={(v) => setField("reactionType", v)} />
                </div>
              </FormSection>

              {/* 6. Functional Assessment (ADL) */}
              <FormSection title="Section 6 · Functional Assessment (ADL)">
                <div className="flex flex-col gap-4">
                  {CA_ADL_ACTIVITIES.map((activity) => (
                    <ChoiceField
                      key={activity.id}
                      label={activity.label}
                      value={ca.adl[activity.id] ?? ""}
                      options={activity.options}
                      onChange={(v) => setAdl(activity.id, v)}
                    />
                  ))}
                </div>
              </FormSection>

              {/* 7. Cognitive & Mental Status */}
              <FormSection title="Section 7 · Cognitive & Mental Status">
                <div className="flex flex-col gap-4">
                  <div className={GRID_3}>
                    <YesNoField label="Alert and Oriented" value={ca.alertAndOriented} onChange={(v) => setField("alertAndOriented", v)} />
                    <YesNoField label="Memory Impairment" value={ca.memoryImpairment} onChange={(v) => setField("memoryImpairment", v)} />
                    <YesNoField label="Confusion" value={ca.confusion} onChange={(v) => setField("confusion", v)} />
                    <YesNoField label="Depression Symptoms" value={ca.depressionSymptoms} onChange={(v) => setField("depressionSymptoms", v)} />
                    <YesNoField label="Anxiety Symptoms" value={ca.anxietySymptoms} onChange={(v) => setField("anxietySymptoms", v)} />
                    <YesNoField label="Ability to Make Decisions" value={ca.abilityToMakeDecisions} onChange={(v) => setField("abilityToMakeDecisions", v)} />
                  </div>
                  <AreaField label="Behavioral Concerns" value={ca.behavioralConcerns} onChange={(v) => setField("behavioralConcerns", v)} />
                </div>
              </FormSection>

              {/* 8. Skin & Wound */}
              <FormSection title="Section 8 · Skin & Wound Assessment">
                <div className="flex flex-col gap-4">
                  <div className={GRID_2}>
                    <ChoiceField label="Skin Condition" value={ca.skinCondition} options={SKIN_OPTIONS} onChange={(v) => setField("skinCondition", v as CaSkinCondition)} />
                    <ChoiceField label="Pressure Injury Risk" value={ca.pressureInjuryRisk} options={CA_RISK_LEVELS} onChange={(v) => setField("pressureInjuryRisk", v as CaRiskLevel)} />
                    <YesNoField label="Existing Wounds" value={ca.existingWounds} onChange={(v) => setField("existingWounds", v)} />
                    <YesNoField label="Drainage Present" value={ca.drainagePresent} onChange={(v) => setField("drainagePresent", v)} />
                    <TextField label="Wound Location" value={ca.woundLocation} onChange={(v) => setField("woundLocation", v)} />
                    <TextField label="Wound Measurements" value={ca.woundMeasurements} onChange={(v) => setField("woundMeasurements", v)} />
                  </div>
                  <AreaField label="Dressing Requirements" value={ca.dressingRequirements} onChange={(v) => setField("dressingRequirements", v)} />
                </div>
              </FormSection>

              {/* 9. Fall & Safety */}
              <FormSection title="Section 9 · Fall & Safety Assessment">
                <div className="flex flex-col gap-4">
                  <div className={GRID_3}>
                    <YesNoField label="History of Falls" value={ca.historyOfFalls} onChange={(v) => setField("historyOfFalls", v)} />
                    <YesNoField label="Balance Problems" value={ca.balanceProblems} onChange={(v) => setField("balanceProblems", v)} />
                    <YesNoField label="Walking Difficulty" value={ca.walkingDifficulty} onChange={(v) => setField("walkingDifficulty", v)} />
                  </div>
                  <div className={GRID_2}>
                    <TextField label="Number of Falls in Last 6 Months" value={ca.numberOfFallsLast6Months} onChange={(v) => setField("numberOfFallsLast6Months", v)} />
                  </div>
                  <AreaField label="Home Safety Hazards" value={ca.homeSafetyHazards} onChange={(v) => setField("homeSafetyHazards", v)} />
                  <ChoiceField label="Fall Risk Level" value={ca.fallRiskLevel} options={CA_RISK_LEVELS} onChange={(v) => setField("fallRiskLevel", v as CaRiskLevel)} />
                </div>
              </FormSection>

              {/* 10. Respiratory & Cardiovascular */}
              <FormSection title="Section 10 · Respiratory & Cardiovascular">
                <div className="flex flex-col gap-4">
                  <p className="text-[13px] font-semibold text-[#10141a]">Respiratory</p>
                  <div className={GRID_3}>
                    <YesNoField label="Shortness of Breath" value={ca.respShortnessOfBreath} onChange={(v) => setField("respShortnessOfBreath", v)} />
                    <YesNoField label="Oxygen Use" value={ca.respOxygenUse} onChange={(v) => setField("respOxygenUse", v)} />
                    <YesNoField label="Cough" value={ca.respCough} onChange={(v) => setField("respCough", v)} />
                  </div>
                  <div className={GRID_2}>
                    <TextField label="Oxygen Flow Rate" value={ca.respOxygenFlowRate} onChange={(v) => setField("respOxygenFlowRate", v)} placeholder="e.g. 2 L/min" />
                  </div>
                  <AreaField label="Lung Assessment Findings" value={ca.respLungFindings} onChange={(v) => setField("respLungFindings", v)} />
                  <p className="text-[13px] font-semibold text-[#10141a]">Cardiovascular</p>
                  <div className={GRID_2}>
                    <YesNoField label="Edema" value={ca.cardioEdema} onChange={(v) => setField("cardioEdema", v)} />
                    <TextField label="Heart Conditions" value={ca.cardioHeartConditions} onChange={(v) => setField("cardioHeartConditions", v)} />
                  </div>
                  <AreaField label="Circulation Problems" value={ca.cardioCirculationProblems} onChange={(v) => setField("cardioCirculationProblems", v)} />
                </div>
              </FormSection>

              {/* 11. Nutritional */}
              <FormSection title="Section 11 · Nutritional Assessment">
                <div className="flex flex-col gap-4">
                  <div className={GRID_2}>
                    <TextField label="Current Diet" value={ca.currentDiet} onChange={(v) => setField("currentDiet", v)} />
                    <TextField label="Appetite" value={ca.appetite} onChange={(v) => setField("appetite", v)} />
                    <YesNoField label="Swallowing Difficulty" value={ca.swallowingDifficulty} onChange={(v) => setField("swallowingDifficulty", v)} />
                    <YesNoField label="Feeding Assistance Required" value={ca.feedingAssistanceRequired} onChange={(v) => setField("feedingAssistanceRequired", v)} />
                    <TextField label="Weight Changes" value={ca.weightChanges} onChange={(v) => setField("weightChanges", v)} />
                    <TextField label="Fluid Restrictions" value={ca.fluidRestrictions} onChange={(v) => setField("fluidRestrictions", v)} />
                  </div>
                </div>
              </FormSection>

              {/* 12. DME */}
              <FormSection title="Section 12 · Durable Medical Equipment (DME)">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Equipment Used</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {CA_DME_ITEMS.map((it) => (
                        <CheckTile
                          key={it.id}
                          label={it.label}
                          checked={!!ca.dme[it.id]}
                          onChange={(next) => toggleRecord("dme", it.id, next)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={GRID_2}>
                    <TextField label="Other Equipment" value={ca.dmeOther} onChange={(v) => setField("dmeOther", v)} />
                  </div>
                </div>
              </FormSection>

              {/* 13. Home Environment & Support System */}
              <FormSection title="Section 13 · Home Environment & Support System">
                <div className="flex flex-col gap-4">
                  <ChoiceField label="Living Situation" value={ca.livingSituation} options={LIVING_OPTIONS} onChange={(v) => setField("livingSituation", v as CaLivingSituation)} />
                  <div className={GRID_2}>
                    <TextField label="Primary Caregiver" value={ca.primaryCaregiver} onChange={(v) => setField("primaryCaregiver", v)} />
                    <TextField label="Caregiver Ability" value={ca.caregiverAbility} onChange={(v) => setField("caregiverAbility", v)} />
                    <YesNoField label="Presence of Pets" value={ca.presenceOfPets} onChange={(v) => setField("presenceOfPets", v)} />
                    <YesNoField label="Smoking in Home" value={ca.smokingInHome} onChange={(v) => setField("smokingInHome", v)} />
                    <TextField label="Transportation Availability" value={ca.transportationAvailability} onChange={(v) => setField("transportationAvailability", v)} />
                  </div>
                  <AreaField label="Home Accessibility" value={ca.homeAccessibility} onChange={(v) => setField("homeAccessibility", v)} />
                  <AreaField label="Emergency Preparedness" value={ca.emergencyPreparedness} onChange={(v) => setField("emergencyPreparedness", v)} />
                </div>
              </FormSection>

              {/* 14. Skilled Care Needs */}
              <FormSection title="Section 14 · Skilled Care Needs Assessment">
                <div className="flex flex-col gap-4">
                  <YesNoField label="Skilled Nursing" value={ca.skilledNursingNeeded} onChange={(v) => setField("skilledNursingNeeded", v)} />
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Skilled Nursing — Reason</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {CA_SKILLED_NURSING_REASONS.map((it) => (
                        <CheckTile key={it.id} label={it.label} checked={!!ca.skilledNursingReasons[it.id]} onChange={(next) => toggleRecord("skilledNursingReasons", it.id, next)} />
                      ))}
                    </div>
                  </div>
                  <YesNoField label="Home Health Aide" value={ca.homeHealthAideNeeded} onChange={(v) => setField("homeHealthAideNeeded", v)} />
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Home Health Aide — Assistance Needed</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {CA_HHA_ASSISTANCE.map((it) => (
                        <CheckTile key={it.id} label={it.label} checked={!!ca.homeHealthAideAssistance[it.id]} onChange={(next) => toggleRecord("homeHealthAideAssistance", it.id, next)} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Therapy Services</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {CA_THERAPY_SERVICES.map((it) => (
                        <CheckTile key={it.id} label={it.label} checked={!!ca.therapyServices[it.id]} onChange={(next) => toggleRecord("therapyServices", it.id, next)} />
                      ))}
                    </div>
                  </div>
                  <YesNoField label="Medical Social Worker" value={ca.medicalSocialWorkerNeeded} onChange={(v) => setField("medicalSocialWorkerNeeded", v)} />
                  <AreaField label="Medical Social Worker — Reason for Need" value={ca.medicalSocialWorkerReason} onChange={(v) => setField("medicalSocialWorkerReason", v)} />
                </div>
              </FormSection>

              {/* 15. Clinical Summary & Recommendations */}
              <FormSection title="Section 15 · Clinical Summary & Recommendations">
                <div className="flex flex-col gap-4">
                  <AreaField label="Clinical Findings" value={ca.clinicalFindings} onChange={(v) => setField("clinicalFindings", v)} />
                  <AreaField label="Risk Factors" value={ca.riskFactors} onChange={(v) => setField("riskFactors", v)} />
                  <AreaField label="Recommended Services" value={ca.recommendedServices} onChange={(v) => setField("recommendedServices", v)} />
                  <div className={GRID_2}>
                    <TextField label="Recommended Visit Frequency" value={ca.recommendedVisitFrequency} onChange={(v) => setField("recommendedVisitFrequency", v)} />
                  </div>
                  <AreaField label="Recommended Goals" value={ca.recommendedGoals} onChange={(v) => setField("recommendedGoals", v)} />
                </div>
              </FormSection>

              {/* 16. Nurse Assessment & Approval */}
              <FormSection title="Section 16 · Nurse Assessment & Approval">
                <div className="flex flex-col gap-4">
                  <div className={GRID_2}>
                    <TextField
                      id="ca-approval-assessor-name"
                      label="Assessor Name"
                      required
                      value={ca.approvalAssessorName}
                      onChange={(v) => setField("approvalAssessorName", v)}
                    />
                    <TextField label="License Number" value={ca.licenseNumber} onChange={(v) => setField("licenseNumber", v)} />
                  </div>
                  <div className={GRID_2}>
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="ca-nurse-signature" required>
                        Signature
                      </FieldLabel>
                      <SignatureField
                        id="ca-nurse-signature"
                        required
                        value={ca.nurseSignature}
                        onOpen={openSignature}
                        onClear={() => setField("nurseSignature", "")}
                        ariaLabel="Nurse signature"
                      />
                    </div>
                    <DatePickerField
                      id="ca-completion-date"
                      label="Assessment Completion Date"
                      required
                      value={ca.assessmentCompletionDate}
                      onChange={(d) => setField("assessmentCompletionDate", d)}
                    />
                  </div>
                  <ChoiceField
                    id="ca-assessment-status"
                    label="Assessment Status"
                    required
                    value={ca.assessmentStatus}
                    options={CA_ASSESSMENT_STATUSES}
                    onChange={(v) => setField("assessmentStatus", v as CaAssessmentStatus)}
                  />
                </div>
              </FormSection>
            </div>
          </div>

          {/* Off-screen paper-faithful template snapshotted for the PDF export. */}
          <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 w-[800px]">
            <div ref={printRef}>
              <ClinicalAssessmentPrintTemplate ca={deferredCa} />
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col gap-2 border-t border-[#e6e7e8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-[44px] w-full sm:w-auto"
              onClick={() => closeModal(false)}
              disabled={!!busy}
            >
              Cancel
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-[44px] w-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e6fafa] sm:w-auto"
                onClick={() => void generate("download")}
                disabled={!!busy}
              >
                {busy === "download" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                )}
                Download PDF
              </Button>
              <Button
                type="button"
                className="h-11 min-h-[44px] w-full shrink-0 bg-[#00b4b8] hover:bg-[#009ea1] sm:w-auto"
                onClick={() => void generate("apply")}
                disabled={!!busy}
              >
                {busy === "apply" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileCheck2 className="mr-2 h-4 w-4" aria-hidden />
                )}
                Use as Clinical Assessment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {signatureModalEverOpened ? (
        <Suspense fallback={null}>
          <DigitalSignatureModal
            isOpen={signatureOpen}
            setIsOpen={(value) => {
              if (!value) setSignatureOpen(false);
            }}
            skipBackend
            nested
            useCase="clinical-assessment"
            onSave={handleSignatureSave}
          />
        </Suspense>
      ) : null}
    </>
  );
}
