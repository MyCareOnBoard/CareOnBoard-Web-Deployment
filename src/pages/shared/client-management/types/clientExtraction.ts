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
    program: string;
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
    services: ExtractionServiceRow[];
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
      priority?: string;
    }[];
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
  }>;
};

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
  narrative: string;
  ispEffectiveDate: string;
  startAuthDate: string;
  endAuthDate: string;
  pcptDate: string;
  sdrStartDate: string;
  sdrEndDate: string;
}>;

export type ClientExtractionResponse = {
  detectedDocumentType: DetectedDocumentType;
  draft: ClientExtractionDraft;
  fieldConfidences: FieldConfidence[];
  warnings: ExtractionWarning[];
  unmappedText: string[];
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
