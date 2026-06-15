import { DocumentTypes } from "./types";

export type ApplicantType = "dsp" | "hha";

export interface ApplicantDocDef {
  /** kebab id == upload fileType == agency-document-statuses key */
  id: DocumentTypes;
  /** camelCase eligibility *Url field */
  field: string;
  label: string;
  placeholder: string;
  required: boolean;
  requiresExpiry: boolean;
  /** I-9/W-4 download block */
  isForm?: boolean;
}

const DSP_DOCS: ApplicantDocDef[] = [
  {
    id: "photo-id",
    field: "photoIdUrl",
    label: "Upload Photo ID (State ID, Passport)",
    placeholder: "Upload your photo ID",
    required: true,
    requiresExpiry: true,
  },
  {
    id: "driver-license",
    field: "driverLicenseUrl",
    label: "Upload Driver’s License (optional)",
    placeholder: "Upload your driver’s license",
    required: false,
    requiresExpiry: true,
  },
  {
    id: "social-security-card",
    field: "socialSecurityCardUrl",
    label: "Upload Social Security Card or valid work permit.",
    placeholder: "Upload social security card",
    required: true,
    requiresExpiry: true,
  },
  {
    id: "diploma",
    field: "diplomaUrl",
    label: "Upload High School Diploma/GED certificate.",
    placeholder: "Upload high school certificate",
    required: true,
    requiresExpiry: false,
  },
  {
    id: "certifications",
    field: "certificationsUrl",
    label: "Upload Any relevant certifications (e.g., CPR, First Aid — optional at this stage).",
    placeholder: "Upload any certificate",
    required: false,
    requiresExpiry: false,
  },
  {
    id: "hepatitis-b-vaccination",
    field: "hepatitisBVaccinationUrl",
    label: "Upload Hepatitis B vaccination series documents or chest x ray.",
    placeholder: "Upload Hepatitis B vaccination series documents or chest x ray.",
    required: false,
    requiresExpiry: false,
  },
  {
    id: "hepatitis-b-immunity",
    field: "hepatitisBImmunityUrl",
    label: "Upload Hepatitis B immunity (titer result)",
    placeholder: "Upload Hepatitis B immunity (titer result)",
    required: false,
    requiresExpiry: false,
  },
  {
    id: "tb-test",
    field: "tbTestResultUrl",
    label: "Upload tb test result.",
    placeholder: "Upload TB test result",
    required: false,
    requiresExpiry: false,
  },
  {
    id: "i9-form",
    field: "i9FormUrl",
    label: "Upload I-9 Form",
    placeholder: "Upload I-9 Form",
    required: true,
    requiresExpiry: false,
    isForm: true,
  },
  {
    id: "w4-form",
    field: "w4FormUrl",
    label: "Upload W-4 Form",
    placeholder: "Upload W-4 Form",
    required: true,
    requiresExpiry: false,
    isForm: true,
  },
];

const HHA_DOCS: ApplicantDocDef[] = [
  {
    id: "photo-id",
    field: "photoIdUrl",
    label: "Upload Photo ID (Driver's License, State ID, Passport)",
    placeholder: "Upload your photo ID",
    required: true,
    requiresExpiry: true,
  },
  {
    id: "social-security-card",
    field: "socialSecurityCardUrl",
    label: "Upload Social Security Card or Valid Work Permit",
    placeholder: "Upload social security card",
    required: true,
    requiresExpiry: true,
  },
  {
    id: "diploma",
    field: "diplomaUrl",
    label: "Upload High School Diploma/GED Certificate",
    placeholder: "Upload high school certificate",
    required: true,
    requiresExpiry: false,
  },
  {
    id: "chha-certificate",
    field: "chhaCertificateUrl",
    label: "Upload CHHA Certificate",
    placeholder: "Upload CHHA certificate",
    required: true,
    requiresExpiry: true,
  },
  {
    id: "cpr-certification",
    field: "cprCertificationUrl",
    label: "Upload CPR Certification",
    placeholder: "Upload CPR certification",
    required: true,
    requiresExpiry: true,
  },
  {
    id: "cna-hha-license",
    field: "cnaHhaLicenseUrl",
    label: "Upload CNA/HHA License (if applicable)",
    placeholder: "Upload CNA/HHA license",
    required: false,
    requiresExpiry: true,
  },
  {
    id: "mmr-record",
    field: "mmrRecordUrl",
    label: "Upload MMR Record",
    placeholder: "Upload MMR record",
    required: true,
    requiresExpiry: false,
  },
  {
    id: "physical-exam",
    field: "physicalExamUrl",
    label: "Upload Physical Exam",
    placeholder: "Upload physical exam",
    required: true,
    requiresExpiry: false,
  },
  {
    id: "tb-test",
    field: "tbTestResultUrl",
    label: "Upload TB Test Result",
    placeholder: "Upload TB test result",
    required: true,
    requiresExpiry: false,
  },
  {
    id: "additional-vaccination",
    field: "additionalVaccinationUrl",
    label: "Upload Additional Vaccination Records (optional)",
    placeholder: "Upload additional vaccination records",
    required: false,
    requiresExpiry: false,
  },
  {
    id: "i9-form",
    field: "i9FormUrl",
    label: "Upload I-9 Form",
    placeholder: "Upload I-9 Form",
    required: true,
    requiresExpiry: false,
    isForm: true,
  },
  {
    id: "w4-form",
    field: "w4FormUrl",
    label: "Upload W-4 Form",
    placeholder: "Upload W-4 Form",
    required: true,
    requiresExpiry: false,
    isForm: true,
  },
];

export function getApplicantDocs(t: ApplicantType = "dsp"): ApplicantDocDef[] {
  return ({ dsp: DSP_DOCS, hha: HHA_DOCS } as Record<ApplicantType, ApplicantDocDef[]>)[t] ?? DSP_DOCS;
}

/** Dedup union of all doc defs, keyed by eligibility *Url field. */
export const ALL_DOC_DEFS: ApplicantDocDef[] = [
  ...new Map([...DSP_DOCS, ...HHA_DOCS].map((d) => [d.field, d])).values(),
];
