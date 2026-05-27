import type { DocKey, EmergencyContactRelationship } from "./formData";

export type ExtractedEmergencyContactRelationship = EmergencyContactRelationship | "";

export type DetectedDocumentType = DocKey | "unknown";

export type ExtractionWarning = {
  path?: string;
  code?: string;
  message: string;
};

export type FieldConfidence = {
  path: string;
  label?: string;
  valuePreview?: string;
  confidence: number;
  sourceSnippet?: string;
  requiresReview?: boolean;
};

export type ExtractionInsuranceDetail = Partial<{
  type: string;
  name: string;
  idGroup: string;
  caseManager: string;
  contact: string;
}>;

export type ExtractionGuardianContact = Partial<{
  name: string;
  relationship: string;
  email: string;
  primaryPhone: string;
  secondaryPhone: string;
  address: string;
  priority: string;
}>;

export type ExtractionCareTeamContact = Partial<{
  role: string;
  name: string;
  agency: string;
  phone: string;
  email: string;
  address: string;
}>;

export type ExtractionAdlSupportNeed = Partial<{
  domain: string;
  levelOfSupport: string;
  notes: string;
}>;

export type ExtractionMedication = Partial<{
  name: string;
  dosage: string;
  frequency: string;
  notes: string;
  selfAdminister: string;
}>;

export type ExtractionEmergencyBackupPlan = Partial<{
  pers: string;
  providerManagedSetting: string;
  advanceDirective: string;
  proxyDecisionMaker: string;
  narrative: string;
}>;

export type ExtractionTeamMember = Partial<{
  name: string;
  relationship: string;
  contact: string;
}>;

export type ExtractionSdrDetailsSource = Partial<{
  outcomeStatement: string;
  serviceName: string;
  serviceCode: string;
  /** Printed provider/agency line from the SDR PDF. */
  provider: string;
  /** Printed payer/source line (e.g. Medicaid). */
  claimsSource: string;
}>;

export type ExtractionSdrDetails = Partial<{
  deliveryMethods: string[];
  supportTasks: string[];
  frequency: string;
  duration: string;
  setting: string;
  staffing: string;
  source: ExtractionSdrDetailsSource;
}>;

/** @deprecated Legacy extraction shape; ISP import uses draft.stage3.diagnosis. */
export type ExtractionDiagnosisEntry = Partial<{
  diagnosisCode: string;
  diagnosisDescription: string;
}>;

export type ExtractionSdrPriorAuthorization = Partial<{
  startDate: string;
  endDate: string;
  paNumber: string;
  approvedUnitsTillDate: string;
}>;

export type ExtractionSdrWeeklyDistributionRow = Partial<{
  weekRange: string;
  units: string;
  hours: string;
}>;

export type ExtractionSdrWeeklyDistribution = Partial<{
  standardLine: string;
  rows: ExtractionSdrWeeklyDistributionRow[];
}>;

export type ExtractionServiceRow = Partial<{
  name: string;
  code: string;
  hours: string;
  totalApprovedHours: string;
  rate: string;
  payType: string;
  clientRate: string;
  clientPayType: string;
  provider: string;
  location: string;
  claimsSource: string;
  unitType: string;
  frequency: string;
  totalUnits: string;
  totalCost: string;
  evvStatus: string;
  evvDescription: string;
  narrative: string;
  ispEffectiveDate: string;
  startAuthDate: string;
  endAuthDate: string;
  pcptDate: string;
  sdrStartDate: string;
  sdrEndDate: string;
  sdrDetails?: ExtractionSdrDetails;
  procedureName?: string;
  /** Total hours derived from units / unit type (SDR detail). */
  sdrComputedTotalHours?: string;
  priorAuthorization?: ExtractionSdrPriorAuthorization;
  weeklyDistribution?: ExtractionSdrWeeklyDistribution;
  /** Model-suggested wizard row (SDR import); validated client-side before apply. */
  matchedOutcomeId?: string;
  matchedServiceId?: string;
  matchConfidence?: string;
  matchReason?: string;
  /** @deprecated Legacy per-service outcome tags; prefer `stage2.outcomes[].services`. */
  outcomes: string[];
}>;

/** Extracted outcome row (owns nested service lines). */
export type ExtractionOutcomeRow = Partial<{
  statement: string;
  services: ExtractionServiceRow[];
}>;

/** Raw draft from Gemini (strings / ISO date strings). */
export type ClientExtractionDraft = {
  stage1?: Partial<{
    firstName: string;
    lastName: string;
    middleName: string;
    gender: string;
    dob: string;
    medicaidId: string;
    dddId: string;
    ssn: string;
    tier: string;
    address: string;
    countyState: string;
    zipCode: string;
    secondaryAddress: string;
    secondaryCountyState: string;
    secondaryZipCode: string;
    phone: string;
    email: string;
    language: string;
    communicationMethod: string;
    planId: string;
    planType: string;
    planPrintDate: string;
    program: string;
    waiverEnrollmentDate: string;
    dddStatus: string;
    medicaidType: string;
    insuranceDetails: ExtractionInsuranceDetail[];
  }>;
  stage2?: Partial<{
    guardianName: string;
    guardianRelationship: string;
    guardianEmail: string;
    guardianPhone: string;
    guardianAddress: string;
    supportCoordinatorName: string;
    supportCoordinatorAgency: string;
    supportCoordinatorContact: string;
    /** Canonical: outcome rows with nested service authorizations. */
    outcomes?: ExtractionOutcomeRow[];
    /** @deprecated Legacy extraction shape; merged into `outcomes` when present. */
    services?: ExtractionServiceRow[];
    guardians?: ExtractionGuardianContact[];
    careTeam?: ExtractionCareTeamContact[];
  }>;
  stage3?: Partial<{
    medicalConditions: string[];
    allergies: string[];
    dietaryRestrictions: string[];
    seizurePlan: string;
    mobilitySupportNeeds: string[];
    behaviorSupportPlan: string;
    communicationNeeds: string[];
    emergencyProtocols: string;
    preferredHospital: string;
    primaryCarePhysician: string;
    diagnosis: string;
    healthHazards: string;
    nutritionNotes: string;
    selfCareNeeds: ExtractionAdlSupportNeed[];
  }>;
  stage4?: Partial<{
    evvRequirement: string;
    primaryVisitLocationGps: string;
    allowedSecondaryLocations: string;
    minShiftLength: string;
    maxShiftLength: string;
    backToBackAllowed: string;
    travelTimeAllowed: string;
  }>;
  stage5?: Partial<{
    genderPreference: string;
    requiredCertifications: string;
    specialConditions: string;
    prefersFamiliar: string;
    noMaleFemaleStaff: string;
    medicalRestrictionsTrained: string;
  }>;
  stage6?: Partial<{
    clientGoals: string;
    communityGoals: string;
    dailyLivingGoals: string;
    behavioralGoals: string;
    skillBuildingGoals: string;
    ispOutcomes: string;
    targetBehaviors: string;
    supportStrategies: string;
    emergencyName: string;
    emergencyRelationship: ExtractedEmergencyContactRelationship;
    primaryPhone: string;
    secondaryPhone: string;
    hospitalPreference: string;
    emergencyProtocol: string;
    medicationList: string;
    emergencyContacts: {
      name?: string;
      relationship?: ExtractedEmergencyContactRelationship;
      primaryPhone?: string;
      secondaryPhone?: string;
      hospitalPreference?: string;
      emergencyProtocol?: string;
      priority?: string;
    }[];
    medications: ExtractionMedication[];
    emergencyBackupPlan: ExtractionEmergencyBackupPlan;
    employmentStatus: string;
    employmentPlan: string;
    votingPlan: string;
  }>;
  stage7?: Partial<{
    aiNotesReview: boolean;
    aiPlanOfCareBuilder: boolean;
    aiGoalTracking: boolean;
    expiringDocsReminder: boolean;
    renewalsReminder: boolean;
    auditCycle: string;
    assignedQaStaff: string;
    requiredVisitDocumentation: string;
    notesReviewRules: string;
    billingValidationRules: string;
    teamMembers: ExtractionTeamMember[];
  }>;
};

export type ClientExtractionResponse = {
  detectedDocumentType: DetectedDocumentType;
  draft: ClientExtractionDraft;
  fieldConfidences: FieldConfidence[];
  warnings: ExtractionWarning[];
  /** Present on older extractions; omitted when using the slim Gemini response schema. */
  unmappedText?: string[];
  extractionJobId?: string;
  sourceDocument?: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    model?: string;
    cached?: boolean;
  };
};

export const DOCUMENT_TYPE_SLOTS: DocKey[] = [
  "isp",
  "pcpt",
  "poc",
  "sdr",
  "bsp",
  "medicalDocs",
  "consents",
];

export function isDocKeyForImport(value: string): value is DocKey {
  return (DOCUMENT_TYPE_SLOTS as string[]).includes(value);
}
