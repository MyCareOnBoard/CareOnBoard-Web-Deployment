import React from "react";
import {
  CA_ADL_ACTIVITIES,
  CA_ASSESSMENT_STATUSES,
  CA_ASSESSMENT_TYPES,
  CA_ASSESSOR_DISCIPLINES,
  CA_DME_ITEMS,
  CA_HHA_ASSISTANCE,
  CA_RISK_LEVELS,
  CA_SKILLED_NURSING_REASONS,
  CA_THERAPY_SERVICES,
  type CaGroupItem,
  type CaOption,
  type CaSignatureType,
  type ClinicalAssessmentFormData,
} from "../types/clinicalAssessment";

/**
 * Paper-faithful render of the Clinical Assessment used ONLY for PDF export.
 * Mirrors the printed 16-section assessment form and is independent of the
 * on-screen modal. Rendered off-screen and snapshotted by generateFormPdfBlob
 * (html2canvas) and tiled across A4 pages, so all styling is inline and uses
 * explicit black/white colors for reliable rasterization.
 *
 * Checkbox alignment, checkmark placement (SVG path inside the box) and the
 * date fields follow the Plan of Care print template (PlanOfCarePrintTemplate),
 * scaled up for the larger body font used here.
 */

const BORDER = "1px solid #000";
/** Thicker rule for fill-in lines so values sit clearly on (not through) the line. */
const UNDERLINE = "1.5px solid #000";

/** Row metrics calibrated (like the Plan of Care template) so html2canvas places
 *  the absolutely-positioned box consistently against the text line. */
const CHECK_ROW = 20;
const BOX_TOP = 6;
const BOX_SIZE = 16;

/**
 * Checkbox drawn as an SVG (vector box + check). html2canvas positions text
 * glyphs by baseline, so a "✓" character can't be reliably centered in a box;
 * an SVG path rasterizes exactly as drawn.
 */
function Box({ checked }: { checked: boolean }) {
  return (
    <svg
      width={BOX_SIZE}
      height={BOX_SIZE}
      viewBox="0 0 15 15"
      style={{ display: "inline-block", verticalAlign: "middle" }}
      aria-hidden="true"
    >
      <rect x="0.7" y="0.7" width="13.6" height="13.6" fill="#ffffff" stroke="#000000" strokeWidth="1.2" />
      {checked ? (
        <path
          d="M3 8 L6.2 11 L12 4.2"
          fill="none"
          stroke="#000000"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

/**
 * Checkbox + label on one line. The box is absolutely positioned at a calibrated
 * offset (absolute positions are rasterized exactly by html2canvas, unlike CSS
 * vertical-centering of a box next to text).
 */
function CheckLabel({
  checked,
  children,
  marginRight,
}: {
  checked: boolean;
  children: React.ReactNode;
  marginRight?: number;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        minHeight: CHECK_ROW,
        lineHeight: `${CHECK_ROW}px`,
        paddingLeft: BOX_SIZE + 6,
        marginRight,
        verticalAlign: "top",
      }}
    >
      <span style={{ position: "absolute", left: 0, top: BOX_TOP }}>
        <Box checked={checked} />
      </span>
      {children}
    </span>
  );
}

/** Inline label + underlined value (mimics a fill-in line). */
function Line({ label, value, grow = 1 }: { label: string; value: string; grow?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flex: grow, minWidth: 0 }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}:</span>
      <span
        style={{
          flex: 1,
          borderBottom: UNDERLINE,
          paddingBottom: 3,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value || " "}
      </span>
    </div>
  );
}

/** Signature line: renders the captured signature image (or a blank line). */
function SignatureLine({
  label,
  value,
  signatureType,
  grow = 1,
}: {
  label: string;
  value: string;
  signatureType?: CaSignatureType;
  grow?: number;
}) {
  const isImage = value.startsWith("data:image");
  // Uploaded signatures render full size; typed/drawn signatures come in oversized.
  const isUpload = signatureType === "upload";
  const imgMaxHeight = isUpload ? 34 : 18;
  const lineMinHeight = isUpload ? 36 : 22;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: grow, minWidth: 0 }}>
      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}:</span>
      <span
        style={{
          flex: 1,
          borderBottom: UNDERLINE,
          minHeight: lineMinHeight,
          display: "flex",
          alignItems: "flex-end",
          overflow: "hidden",
        }}
      >
        {isImage ? (
          <img src={value} alt="" style={{ maxHeight: imgMaxHeight, maxWidth: "100%", objectFit: "contain" }} />
        ) : null}
      </span>
    </div>
  );
}

/**
 * Date rendered as MM / DD / YYYY underlined segments (slashes always shown).
 * The slashes and the label share the SAME box model as the underlined segments
 * (same line-height, bottom padding and a transparent bottom rule) and the row
 * is bottom-aligned, so every glyph rests on the same line — the dashes meet the
 * BOTTOM of the slashes instead of floating up near their top.
 */
function DateField({ label, value }: { label: string; value?: Date }) {
  // Shared metrics: keep the slash/label boxes identical in height to the
  // segment boxes (including the 1.5px rule) so all bottom edges coincide.
  const cell: React.CSSProperties = {
    display: "inline-block",
    paddingBottom: 3,
    lineHeight: 1.2,
    borderBottom: "1.5px solid transparent",
  };
  const seg = (text: string, w: number) => (
    <span style={{ ...cell, minWidth: w, textAlign: "center", borderBottom: UNDERLINE }}>
      {text || " "}
    </span>
  );
  const slash = () => <span style={{ ...cell, fontWeight: 700 }}>/</span>;
  const mm = value ? String(value.getMonth() + 1).padStart(2, "0") : "";
  const dd = value ? String(value.getDate()).padStart(2, "0") : "";
  const yyyy = value ? String(value.getFullYear()) : "";
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ ...cell, fontWeight: 700 }}>{label}:</span>
      {seg(mm, 28)}
      {slash()}
      {seg(dd, 28)}
      {slash()}
      {seg(yyyy, 50)}
    </span>
  );
}

function SectionTitle({
  n,
  title,
  breakBefore,
}: {
  n: number;
  title: string;
  breakBefore?: boolean;
}) {
  return (
    <div
      data-pdf-block="1"
      data-pdf-keep-next="1"
      data-pdf-break-before={breakBefore ? "1" : undefined}
      style={{ marginTop: 18, marginBottom: 8, borderBottom: "2px solid #000", paddingBottom: 3 }}
    >
      <span style={{ fontWeight: 700, fontSize: 16 }}>{`Section ${n}: ${title}`}</span>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div data-pdf-block="1" style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 8 }}>
      {children}
    </div>
  );
}

/** Single-select option group: all options shown, the chosen one ticked. */
function OptionRow({ label, options, value }: { label?: string; options: CaOption[]; value: string }) {
  return (
    <div data-pdf-block="1" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
      {label ? <span style={{ fontWeight: 700 }}>{label}:</span> : null}
      {options.map((o) => (
        <CheckLabel key={o.value} checked={value === o.value}>
          {o.label}
        </CheckLabel>
      ))}
    </div>
  );
}

/** Multi-select group: items ticked per the selection record. */
function MultiRow({
  label,
  items,
  selected,
}: {
  label?: string;
  items: CaGroupItem[];
  selected: Record<string, boolean>;
}) {
  return (
    <div data-pdf-block="1" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
      {label ? <span style={{ fontWeight: 700 }}>{label}:</span> : null}
      {items.map((it) => (
        <CheckLabel key={it.id} checked={!!selected[it.id]}>
          {it.label}
        </CheckLabel>
      ))}
    </div>
  );
}

function YesNo({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10, marginRight: 18 }}>
      <span style={{ fontWeight: 700 }}>{label}:</span>
      <CheckLabel checked={value === "yes"}>Yes</CheckLabel>
      <CheckLabel checked={value === "no"}>No</CheckLabel>
    </span>
  );
}

const SKIN_OPTIONS: CaOption[] = [
  { value: "normal", label: "Normal" },
  { value: "abnormal", label: "Abnormal" },
];
const LIVING_OPTIONS: CaOption[] = [
  { value: "alone", label: "Lives Alone" },
  { value: "withFamily", label: "Lives With Family" },
];

export default function ClinicalAssessmentPrintTemplate({
  ca,
}: {
  ca: ClinicalAssessmentFormData;
}) {
  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        color: "#000",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: 14,
        lineHeight: 1.45,
        padding: "16px 0 24px",
      }}
    >
      <div data-pdf-block="1" style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 22 }}>HOME HEALTH CLINICAL ASSESSMENT</span>
      </div>

      {/* Section 1 */}
      <SectionTitle n={1} title="Assessment Information" />
      <Row>
        <DateField label="Assessment Date" value={ca.assessmentDate} />
      </Row>
      <OptionRow label="Assessment Type" options={CA_ASSESSMENT_TYPES} value={ca.assessmentType} />
      <Row>
        <Line label="Assessor Name" value={ca.assessorName} grow={2} />
      </Row>
      <OptionRow label="Assessor Discipline" options={CA_ASSESSOR_DISCIPLINES} value={ca.assessorDiscipline} />
      <Row>
        <Line label="Location of Assessment" value={ca.locationOfAssessment} />
      </Row>
      <Row>
        <Line label="Referral Reason" value={ca.referralReason} />
      </Row>

      {/* Section 2 */}
      <SectionTitle n={2} title="Medical History" />
      <Row>
        <Line label="Primary Diagnosis" value={ca.primaryDiagnosis} />
      </Row>
      <Row>
        <Line label="Secondary Diagnoses" value={ca.secondaryDiagnoses} />
      </Row>
      <Row>
        <Line label="Past Medical History" value={ca.pastMedicalHistory} />
      </Row>
      <Row>
        <Line label="Previous Surgeries" value={ca.previousSurgeries} />
      </Row>
      <Row>
        <Line label="Recent Hospitalizations" value={ca.recentHospitalizations} />
      </Row>
      <Row>
        <Line label="Emergency Room Visits" value={ca.emergencyRoomVisits} />
      </Row>
      <Row>
        <Line label="Chronic Conditions" value={ca.chronicConditions} />
      </Row>

      {/* Section 3 */}
      <SectionTitle n={3} title="Vital Signs & Physical Health" />
      <Row>
        <Line label="Blood Pressure" value={ca.bloodPressure} />
        <Line label="Heart Rate" value={ca.heartRate} />
        <Line label="Respiratory Rate" value={ca.respiratoryRate} />
      </Row>
      <Row>
        <Line label="Temperature" value={ca.temperature} />
        <Line label="Oxygen Saturation" value={ca.oxygenSaturation} />
        <Line label="Pain Level (0–10)" value={ca.painLevel} />
      </Row>
      <Row>
        <Line label="Weight" value={ca.weight} />
        <Line label="Height" value={ca.height} />
        <Line label="BMI" value={ca.bmi} />
      </Row>

      {/* Section 4 */}
      <SectionTitle n={4} title="Medication Assessment" />
      {ca.medications.length === 0 ? (
        <div data-pdf-block="1" style={{ fontStyle: "italic" }}>No medications recorded.</div>
      ) : (
        ca.medications.map((m, i) => (
          <div key={m.id} data-pdf-block="1" style={{ border: BORDER, padding: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 5 }}>{`Medication ${i + 1}`}</div>
            <Row>
              <Line label="Name" value={m.name} />
              <Line label="Dosage" value={m.dosage} />
              <Line label="Route" value={m.route} />
            </Row>
            <Row>
              <Line label="Frequency" value={m.frequency} />
              <Line label="Purpose" value={m.purpose} />
            </Row>
            <Row>
              <Line label="Prescribing Physician" value={m.prescribingPhysician} />
              <Line label="Compliance" value={m.compliance} />
            </Row>
            <Row>
              <Line label="Side Effects Noted" value={m.sideEffects} />
            </Row>
            <YesNo label="Medication Management Required" value={m.managementRequired} />
          </div>
        ))
      )}

      {/* Section 5 */}
      <SectionTitle n={5} title="Allergy Assessment" />
      <Row>
        <Line label="Drug Allergies" value={ca.drugAllergies} />
        <Line label="Food Allergies" value={ca.foodAllergies} />
      </Row>
      <Row>
        <Line label="Environmental Allergies" value={ca.environmentalAllergies} />
        <Line label="Reaction Type" value={ca.reactionType} />
      </Row>

      {/* Section 6 */}
      <SectionTitle n={6} title="Functional Assessment (ADL)" breakBefore />
      {CA_ADL_ACTIVITIES.map((activity) => (
        <OptionRow
          key={activity.id}
          label={activity.label}
          options={activity.options}
          value={ca.adl[activity.id] ?? ""}
        />
      ))}

      {/* Section 7 */}
      <SectionTitle n={7} title="Cognitive & Mental Status" />
      <Row>
        <YesNo label="Alert and Oriented" value={ca.alertAndOriented} />
        <YesNo label="Memory Impairment" value={ca.memoryImpairment} />
        <YesNo label="Confusion" value={ca.confusion} />
      </Row>
      <Row>
        <YesNo label="Depression Symptoms" value={ca.depressionSymptoms} />
        <YesNo label="Anxiety Symptoms" value={ca.anxietySymptoms} />
        <YesNo label="Ability to Make Decisions" value={ca.abilityToMakeDecisions} />
      </Row>
      <Row>
        <Line label="Behavioral Concerns" value={ca.behavioralConcerns} />
      </Row>

      {/* Section 8 */}
      <SectionTitle n={8} title="Skin & Wound Assessment" />
      <OptionRow label="Skin Condition" options={SKIN_OPTIONS} value={ca.skinCondition} />
      <OptionRow label="Pressure Injury Risk" options={CA_RISK_LEVELS} value={ca.pressureInjuryRisk} />
      <Row>
        <YesNo label="Existing Wounds" value={ca.existingWounds} />
        <YesNo label="Drainage Present" value={ca.drainagePresent} />
      </Row>
      <Row>
        <Line label="Wound Location" value={ca.woundLocation} />
        <Line label="Wound Measurements" value={ca.woundMeasurements} />
      </Row>
      <Row>
        <Line label="Dressing Requirements" value={ca.dressingRequirements} />
      </Row>

      {/* Section 9 */}
      <SectionTitle n={9} title="Fall & Safety Assessment" />
      <Row>
        <YesNo label="History of Falls" value={ca.historyOfFalls} />
        <YesNo label="Balance Problems" value={ca.balanceProblems} />
        <YesNo label="Walking Difficulty" value={ca.walkingDifficulty} />
      </Row>
      <Row>
        <Line label="Number of Falls in Last 6 Months" value={ca.numberOfFallsLast6Months} />
      </Row>
      <Row>
        <Line label="Home Safety Hazards" value={ca.homeSafetyHazards} />
      </Row>
      <OptionRow label="Fall Risk Level" options={CA_RISK_LEVELS} value={ca.fallRiskLevel} />

      {/* Section 10 */}
      <SectionTitle n={10} title="Respiratory & Cardiovascular Assessment" />
      <div data-pdf-block="1" data-pdf-keep-next="1" style={{ fontWeight: 700, marginBottom: 5 }}>
        Respiratory
      </div>
      <Row>
        <YesNo label="Shortness of Breath" value={ca.respShortnessOfBreath} />
        <YesNo label="Oxygen Use" value={ca.respOxygenUse} />
        <YesNo label="Cough" value={ca.respCough} />
      </Row>
      <Row>
        <Line label="Oxygen Flow Rate" value={ca.respOxygenFlowRate} />
      </Row>
      <Row>
        <Line label="Lung Assessment Findings" value={ca.respLungFindings} />
      </Row>
      <div data-pdf-block="1" data-pdf-keep-next="1" style={{ fontWeight: 700, margin: "8px 0 5px" }}>
        Cardiovascular
      </div>
      <Row>
        <YesNo label="Edema" value={ca.cardioEdema} />
      </Row>
      <Row>
        <Line label="Heart Conditions" value={ca.cardioHeartConditions} />
      </Row>
      <Row>
        <Line label="Circulation Problems" value={ca.cardioCirculationProblems} />
      </Row>

      {/* Section 11 */}
      <SectionTitle n={11} title="Nutritional Assessment" breakBefore />
      <Row>
        <Line label="Current Diet" value={ca.currentDiet} />
        <Line label="Appetite" value={ca.appetite} />
      </Row>
      <Row>
        <YesNo label="Swallowing Difficulty" value={ca.swallowingDifficulty} />
        <YesNo label="Feeding Assistance Required" value={ca.feedingAssistanceRequired} />
      </Row>
      <Row>
        <Line label="Weight Changes" value={ca.weightChanges} />
        <Line label="Fluid Restrictions" value={ca.fluidRestrictions} />
      </Row>

      {/* Section 12 */}
      <SectionTitle n={12} title="Durable Medical Equipment (DME)" />
      <MultiRow label="Equipment Used" items={CA_DME_ITEMS} selected={ca.dme} />
      <Row>
        <Line label="Other Equipment" value={ca.dmeOther} />
      </Row>

      {/* Section 13 */}
      <SectionTitle n={13} title="Home Environment & Support System" />
      <OptionRow options={LIVING_OPTIONS} value={ca.livingSituation} />
      <Row>
        <Line label="Primary Caregiver" value={ca.primaryCaregiver} />
        <Line label="Caregiver Ability" value={ca.caregiverAbility} />
      </Row>
      <Row>
        <Line label="Home Accessibility" value={ca.homeAccessibility} />
      </Row>
      <Row>
        <YesNo label="Presence of Pets" value={ca.presenceOfPets} />
        <YesNo label="Smoking in Home" value={ca.smokingInHome} />
      </Row>
      <Row>
        <Line label="Transportation Availability" value={ca.transportationAvailability} />
      </Row>
      <Row>
        <Line label="Emergency Preparedness" value={ca.emergencyPreparedness} />
      </Row>

      {/* Section 14 */}
      <SectionTitle n={14} title="Skilled Care Needs Assessment" />
      <Row>
        <YesNo label="Skilled Nursing" value={ca.skilledNursingNeeded} />
      </Row>
      <MultiRow label="Reason" items={CA_SKILLED_NURSING_REASONS} selected={ca.skilledNursingReasons} />
      <Row>
        <YesNo label="Home Health Aide" value={ca.homeHealthAideNeeded} />
      </Row>
      <MultiRow label="Assistance Needed" items={CA_HHA_ASSISTANCE} selected={ca.homeHealthAideAssistance} />
      <MultiRow label="Therapy Services" items={CA_THERAPY_SERVICES} selected={ca.therapyServices} />
      <Row>
        <YesNo label="Medical Social Worker" value={ca.medicalSocialWorkerNeeded} />
      </Row>
      <Row>
        <Line label="Reason for Need" value={ca.medicalSocialWorkerReason} />
      </Row>

      {/* Section 15 */}
      <SectionTitle n={15} title="Clinical Summary & Recommendations" />
      <Row>
        <Line label="Clinical Findings" value={ca.clinicalFindings} />
      </Row>
      <Row>
        <Line label="Risk Factors" value={ca.riskFactors} />
      </Row>
      <Row>
        <Line label="Recommended Services" value={ca.recommendedServices} />
      </Row>
      <Row>
        <Line label="Recommended Visit Frequency" value={ca.recommendedVisitFrequency} />
      </Row>
      <Row>
        <Line label="Recommended Goals" value={ca.recommendedGoals} />
      </Row>

      {/* Section 16 */}
      <SectionTitle n={16} title="Nurse Assessment & Approval" />
      <Row>
        <Line label="Assessor Name" value={ca.approvalAssessorName} grow={2} />
        <Line label="License Number" value={ca.licenseNumber} />
      </Row>
      <div data-pdf-block="1" style={{ display: "flex", alignItems: "flex-end", gap: 18, marginBottom: 8 }}>
        <SignatureLine
          label="Signature"
          value={ca.nurseSignature}
          signatureType={ca.nurseSignatureType}
          grow={3}
        />
        <DateField label="Completion Date" value={ca.assessmentCompletionDate} />
      </div>
      <OptionRow label="Assessment Status" options={CA_ASSESSMENT_STATUSES} value={ca.assessmentStatus} />
    </div>
  );
}
