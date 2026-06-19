/**
 * Home Health Clinical Assessment form model.
 * Mirrors the paper "CareOnboard Home Health Clinical Assessment Form" (16 sections)
 * so it can be filled on a tablet/phone, exported to PDF, and attached as the
 * client's Clinical Assessment document. Built to parallel the Plan of Care model
 * (see ./planOfCare) — data-driven constants drive both the on-screen form and the
 * PDF template.
 */

export type CaOption = { value: string; label: string };
export type CaGroupItem = { id: string; label: string };

/** Single ADL activity with its own level-of-independence option set. */
export type CaAdlActivity = { id: string; label: string; options: CaOption[] };

export type CaYesNo = "" | "yes" | "no";
export type CaSignatureType = "type" | "draw" | "upload";

export type CaAssessmentType =
  | ""
  | "initial"
  | "soc"
  | "followUp"
  | "changeInCondition"
  | "recertification";
export type CaAssessorDiscipline = "" | "rn" | "pt" | "ot" | "st";
export type CaSkinCondition = "" | "normal" | "abnormal";
export type CaLivingSituation = "" | "alone" | "withFamily";
export type CaRiskLevel = "" | "low" | "moderate" | "high";
export type CaAssessmentStatus =
  | ""
  | "draft"
  | "completed"
  | "submittedForReview"
  | "approved";

/* ------------------------------------------------------------------ *
 * Data-driven option / group constants (drive both the form and PDF)
 * ------------------------------------------------------------------ */

export const CA_ASSESSMENT_TYPES: CaOption[] = [
  { value: "initial", label: "Initial Assessment" },
  { value: "soc", label: "Start of Care (SOC)" },
  { value: "followUp", label: "Follow-Up Assessment" },
  { value: "changeInCondition", label: "Change in Condition" },
  { value: "recertification", label: "Recertification Assessment" },
];

export const CA_ASSESSOR_DISCIPLINES: CaOption[] = [
  { value: "rn", label: "RN" },
  { value: "pt", label: "PT" },
  { value: "ot", label: "OT" },
  { value: "st", label: "ST" },
];

export const CA_RISK_LEVELS: CaOption[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export const CA_ASSESSMENT_STATUSES: CaOption[] = [
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "submittedForReview", label: "Submitted for Clinical Review" },
  { value: "approved", label: "Approved" },
];

// Client demographics — values mirror the Add Client wizard Stage 1 options so a
// prefilled value maps straight through and the PDF prints the matching label.
export const CA_GENDERS: CaOption[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export const CA_MARITAL_STATUSES: CaOption[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "divorced", label: "Divorced" },
  { value: "separated", label: "Separated" },
];

export const CA_PAIN_LEVELS: CaOption[] = Array.from({ length: 11 }, (_, i) => ({
  value: String(i),
  label: String(i),
}));

// ADL — Bathing/Dressing/Grooming/Toileting/Eating share one level set; Mobility
// and Transfers have their OWN distinct sets (do not collapse into one list).
const ADL_STANDARD: CaOption[] = [
  { value: "independent", label: "Independent" },
  { value: "supervision", label: "Requires Supervision" },
  { value: "assistance", label: "Requires Assistance" },
  { value: "dependent", label: "Dependent" },
];
const ADL_MOBILITY: CaOption[] = [
  { value: "independent", label: "Independent" },
  { value: "assistiveDevice", label: "Uses Assistive Device" },
  { value: "assistance", label: "Requires Assistance" },
  { value: "bedBound", label: "Bed Bound" },
];
const ADL_TRANSFERS: CaOption[] = [
  { value: "independent", label: "Independent" },
  { value: "assistance", label: "Requires Assistance" },
  { value: "mechanicalLift", label: "Mechanical Lift Required" },
];

export const CA_ADL_ACTIVITIES: CaAdlActivity[] = [
  { id: "bathing", label: "Bathing", options: ADL_STANDARD },
  { id: "dressing", label: "Dressing", options: ADL_STANDARD },
  { id: "grooming", label: "Grooming", options: ADL_STANDARD },
  { id: "toileting", label: "Toileting", options: ADL_STANDARD },
  { id: "eating", label: "Eating", options: ADL_STANDARD },
  { id: "mobility", label: "Mobility", options: ADL_MOBILITY },
  { id: "transfers", label: "Transfers", options: ADL_TRANSFERS },
];

export const CA_DME_ITEMS: CaGroupItem[] = [
  { id: "wheelchair", label: "Wheelchair" },
  { id: "walker", label: "Walker" },
  { id: "cane", label: "Cane" },
  { id: "hospitalBed", label: "Hospital Bed" },
  { id: "oxygenEquipment", label: "Oxygen Equipment" },
  { id: "commode", label: "Commode" },
  { id: "liftDevice", label: "Lift Device" },
];

export const CA_SKILLED_NURSING_REASONS: CaGroupItem[] = [
  { id: "medicationManagement", label: "Medication Management" },
  { id: "diseaseEducation", label: "Disease Education" },
  { id: "woundCare", label: "Wound Care" },
  { id: "monitoring", label: "Monitoring" },
];

export const CA_HHA_ASSISTANCE: CaGroupItem[] = [
  { id: "bathing", label: "Bathing" },
  { id: "grooming", label: "Grooming" },
  { id: "dressing", label: "Dressing" },
  { id: "toileting", label: "Toileting" },
  { id: "mobility", label: "Mobility" },
];

export const CA_THERAPY_SERVICES: CaGroupItem[] = [
  { id: "physical", label: "Physical Therapy" },
  { id: "occupational", label: "Occupational Therapy" },
  { id: "speech", label: "Speech Therapy" },
];

/* ------------------------------------------------------------------ *
 * Form data model
 * ------------------------------------------------------------------ */

export type CaMedication = {
  id: string;
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  purpose: string;
  prescribingPhysician: string;
  compliance: string;
  sideEffects: string;
  managementRequired: CaYesNo;
};

export type ClinicalAssessmentFormData = {
  // Section 1 — Assessment Information
  assessmentDate?: Date;
  assessmentType: CaAssessmentType;
  assessorName: string;
  assessorDiscipline: CaAssessorDiscipline;
  locationOfAssessment: string;
  referralReason: string;

  // Section 2 — Client Basic Information
  clientFirstName: string;
  clientLastName: string;
  clientMiddleName: string;
  clientPreferredName: string;
  clientDob?: Date;
  clientGender: string;
  clientMaritalStatus: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientMedicaidId: string;
  clientMedicareId: string;
  clientSsn: string;

  // Section 3 — Medical History
  primaryDiagnosis: string;
  secondaryDiagnoses: string;
  pastMedicalHistory: string;
  previousSurgeries: string;
  recentHospitalizations: string;
  emergencyRoomVisits: string;
  chronicConditions: string;

  // Section 4 — Vital Signs & Physical Health (strings: values carry units)
  bloodPressure: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  bmi: string;
  painLevel: string;

  // Section 5 — Medication Assessment
  medications: CaMedication[];

  // Section 6 — Allergy Assessment
  drugAllergies: string;
  foodAllergies: string;
  environmentalAllergies: string;
  reactionType: string;

  // Section 7 — Functional Assessment (ADL); keyed by CA_ADL_ACTIVITIES id
  adl: Record<string, string>;

  // Section 8 — Cognitive & Mental Status
  alertAndOriented: CaYesNo;
  memoryImpairment: CaYesNo;
  confusion: CaYesNo;
  depressionSymptoms: CaYesNo;
  anxietySymptoms: CaYesNo;
  abilityToMakeDecisions: CaYesNo;
  behavioralConcerns: string;

  // Section 9 — Skin & Wound
  skinCondition: CaSkinCondition;
  pressureInjuryRisk: CaRiskLevel;
  existingWounds: CaYesNo;
  woundLocation: string;
  woundMeasurements: string;
  drainagePresent: CaYesNo;
  dressingRequirements: string;

  // Section 10 — Fall & Safety
  historyOfFalls: CaYesNo;
  numberOfFallsLast6Months: string;
  balanceProblems: CaYesNo;
  walkingDifficulty: CaYesNo;
  homeSafetyHazards: string;
  fallRiskLevel: CaRiskLevel;

  // Section 11 — Respiratory & Cardiovascular
  respShortnessOfBreath: CaYesNo;
  respOxygenUse: CaYesNo;
  respOxygenFlowRate: string;
  respCough: CaYesNo;
  respLungFindings: string;
  cardioHeartConditions: string;
  cardioEdema: CaYesNo;
  cardioCirculationProblems: string;

  // Section 12 — Nutritional
  currentDiet: string;
  appetite: string;
  swallowingDifficulty: CaYesNo;
  weightChanges: string;
  feedingAssistanceRequired: CaYesNo;
  fluidRestrictions: string;

  // Section 13 — Durable Medical Equipment; keyed by CA_DME_ITEMS id
  dme: Record<string, boolean>;
  dmeOther: string;

  // Section 14 — Home Environment & Support System
  livingSituation: CaLivingSituation;
  primaryCaregiver: string;
  caregiverAbility: string;
  homeAccessibility: string;
  presenceOfPets: CaYesNo;
  smokingInHome: CaYesNo;
  transportationAvailability: string;
  emergencyPreparedness: string;

  // Section 15 — Skilled Care Needs (records keyed by their constant ids)
  skilledNursingNeeded: CaYesNo;
  skilledNursingReasons: Record<string, boolean>;
  homeHealthAideNeeded: CaYesNo;
  homeHealthAideAssistance: Record<string, boolean>;
  therapyServices: Record<string, boolean>;
  medicalSocialWorkerNeeded: CaYesNo;
  medicalSocialWorkerReason: string;

  // Section 16 — Clinical Summary & Recommendations
  clinicalFindings: string;
  riskFactors: string;
  recommendedServices: string;
  recommendedVisitFrequency: string;
  recommendedGoals: string;

  // Section 17 — Nurse Assessment & Approval (assessorName kept separate from Section 1)
  approvalAssessorName: string;
  licenseNumber: string;
  nurseSignature: string;
  nurseSignatureType?: CaSignatureType;
  assessmentCompletionDate?: Date;
  assessmentStatus: CaAssessmentStatus;
};

function makeId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyCaMedication(): CaMedication {
  return {
    id: makeId("med"),
    name: "",
    dosage: "",
    route: "",
    frequency: "",
    purpose: "",
    prescribingPhysician: "",
    compliance: "",
    sideEffects: "",
    managementRequired: "",
  };
}

function emptyBoolRecord(items: CaGroupItem[]): Record<string, boolean> {
  const record: Record<string, boolean> = {};
  for (const item of items) record[item.id] = false;
  return record;
}

export function createEmptyClinicalAssessmentForm(
  prefill: Partial<ClinicalAssessmentFormData> = {},
): ClinicalAssessmentFormData {
  const adl: Record<string, string> = {};
  for (const activity of CA_ADL_ACTIVITIES) adl[activity.id] = "";

  return {
    assessmentDate: undefined,
    assessmentType: "",
    assessorName: "",
    assessorDiscipline: "",
    locationOfAssessment: "",
    referralReason: "",

    clientFirstName: "",
    clientLastName: "",
    clientMiddleName: "",
    clientPreferredName: "",
    clientDob: undefined,
    clientGender: "",
    clientMaritalStatus: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    clientMedicaidId: "",
    clientMedicareId: "",
    clientSsn: "",

    primaryDiagnosis: "",
    secondaryDiagnoses: "",
    pastMedicalHistory: "",
    previousSurgeries: "",
    recentHospitalizations: "",
    emergencyRoomVisits: "",
    chronicConditions: "",

    bloodPressure: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    bmi: "",
    painLevel: "",

    medications: [],

    drugAllergies: "",
    foodAllergies: "",
    environmentalAllergies: "",
    reactionType: "",

    adl,

    alertAndOriented: "",
    memoryImpairment: "",
    confusion: "",
    depressionSymptoms: "",
    anxietySymptoms: "",
    abilityToMakeDecisions: "",
    behavioralConcerns: "",

    skinCondition: "",
    pressureInjuryRisk: "",
    existingWounds: "",
    woundLocation: "",
    woundMeasurements: "",
    drainagePresent: "",
    dressingRequirements: "",

    historyOfFalls: "",
    numberOfFallsLast6Months: "",
    balanceProblems: "",
    walkingDifficulty: "",
    homeSafetyHazards: "",
    fallRiskLevel: "",

    respShortnessOfBreath: "",
    respOxygenUse: "",
    respOxygenFlowRate: "",
    respCough: "",
    respLungFindings: "",
    cardioHeartConditions: "",
    cardioEdema: "",
    cardioCirculationProblems: "",

    currentDiet: "",
    appetite: "",
    swallowingDifficulty: "",
    weightChanges: "",
    feedingAssistanceRequired: "",
    fluidRestrictions: "",

    dme: emptyBoolRecord(CA_DME_ITEMS),
    dmeOther: "",

    livingSituation: "",
    primaryCaregiver: "",
    caregiverAbility: "",
    homeAccessibility: "",
    presenceOfPets: "",
    smokingInHome: "",
    transportationAvailability: "",
    emergencyPreparedness: "",

    skilledNursingNeeded: "",
    skilledNursingReasons: emptyBoolRecord(CA_SKILLED_NURSING_REASONS),
    homeHealthAideNeeded: "",
    homeHealthAideAssistance: emptyBoolRecord(CA_HHA_ASSISTANCE),
    therapyServices: emptyBoolRecord(CA_THERAPY_SERVICES),
    medicalSocialWorkerNeeded: "",
    medicalSocialWorkerReason: "",

    clinicalFindings: "",
    riskFactors: "",
    recommendedServices: "",
    recommendedVisitFrequency: "",
    recommendedGoals: "",

    approvalAssessorName: "",
    licenseNumber: "",
    nurseSignature: "",
    nurseSignatureType: undefined,
    assessmentCompletionDate: undefined,
    assessmentStatus: "",

    ...prefill,
  };
}

export function buildClinicalAssessmentFileName(clientName: string): string {
  const safe =
    clientName.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "client";
  return `${safe}_clinical_assessment.pdf`;
}
