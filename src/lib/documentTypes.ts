import {ALL_DOC_DEFS} from "@/pages/applicant/application/documentConfig";

/**
 * Readable names for the canonical staff document types
 * (CareOnBoard-BackEnd/functions/config/document-types.js).
 */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  "resume": "Resume",
  "photo-id": "Photo ID",
  "driver-license": "Driver's License",
  "social-security-card": "Social Security Card",
  "diploma": "Diploma",
  "certifications": "Certifications",
  "hepatitis-b-vaccination": "Hepatitis B vaccination series documents or chest x ray",
  "hepatitis-b-immunity": "Hepatitis B immunity titer result",
  "tb-test": "TB test result",
  "chha-certificate": "CHHA Certificate",
  "cpr-certification": "CPR Certification",
  "cna-hha-license": "CNA/HHA License",
  "mmr-record": "MMR Record",
  "physical-exam": "Physical Exam",
  "additional-vaccination": "Additional Vaccination Records",
  "i9-form": "I-9 Form",
  "w4-form": "W-4 Form",
  "background-check": "Background Check",
  "drug-test": "Drug Test",
};

const fold = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

// Canonical ids plus the camelCase field names older records were saved under
// ("chhaCertificate", "chhaCertificateUrl" -> "chha-certificate").
const ALIASES = new Map<string, string>();
for (const id of Object.keys(DOCUMENT_TYPE_LABELS)) ALIASES.set(fold(id), id);
for (const def of ALL_DOC_DEFS) {
  ALIASES.set(fold(def.field), def.id);
  ALIASES.set(fold(def.field.replace(/Url$/, "")), def.id);
}

/** Canonical id for a stored document type or name, or undefined when it isn't a known type. */
export function canonicalDocumentType(value?: string | null): string | undefined {
  return value ? ALIASES.get(fold(value)) : undefined;
}

/**
 * Readable name for a stored document name. Only raw type keys ("chhaCertificate",
 * "tb-test") are replaced; a name that already reads as words is kept as written.
 */
export function documentTypeLabel(value: string): string {
  if (!value || /\s/.test(value)) return value;
  const id = canonicalDocumentType(value);
  return id ? DOCUMENT_TYPE_LABELS[id] : value;
}
