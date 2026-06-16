import type { ClientDocumentKey } from "@/lib/api/clients";
import type { FieldConfidence } from "../types/clientExtraction";

/**
 * Single source of truth for client-document type metadata, shared by the upload
 * handler, the add/super-admin upload modals, the import dialog, and the SDR panel.
 */

/** DocKey/ClientDocumentKey -> server document-type slug. */
export const DOC_KEY_TO_SERVER_TYPE: Record<ClientDocumentKey, string> = {
  isp: "isp",
  pcpt: "pcpt",
  poc: "plan-of-care",
  sdr: "sdr",
  bsp: "bsp",
  medicalDocs: "medical-documents",
  consents: "consent-and-releases",
  physicianOrders: "physician-orders",
  insuranceCards: "insurance-cards",
  medicaidCard: "medicaid-card",
  medicareCard: "medicare-card",
  idCard: "id-card",
  guardianshipDocs: "guardianship-documents",
  assessmentForms: "assessment-forms",
  clinicalAssessment: "clinical-assessment",
  form485: "form-485",
  hospitalDischarge: "hospital-discharge-papers",
};

/** Options for the client-details "upload document" type pickers. */
export const DOCUMENT_TYPE_OPTIONS: Array<{ value: ClientDocumentKey; label: string }> = [
  { value: "isp", label: "ISP (Individualized Service Plan)" },
  { value: "pcpt", label: "PCPT (Person-Centered Planning Tool)" },
  { value: "poc", label: "Plan of Care (POC)" },
  { value: "sdr", label: "SDR (Service Detail Report)" },
  { value: "bsp", label: "Behavior Plan / BSP" },
  { value: "medicalDocs", label: "Medical Documents" },
  { value: "consents", label: "Consents & Releases" },
  { value: "physicianOrders", label: "Physician Orders" },
  { value: "insuranceCards", label: "Insurance Cards" },
  { value: "medicaidCard", label: "Medicaid Card" },
  { value: "medicareCard", label: "Medicare Card" },
  { value: "idCard", label: "ID Card" },
  { value: "guardianshipDocs", label: "Guardianship / POA Documents" },
  { value: "assessmentForms", label: "Assessment Forms" },
  { value: "clinicalAssessment", label: "Clinical Assessment" },
  { value: "form485", label: "Form 485" },
  { value: "hospitalDischarge", label: "Hospital Discharge Papers" },
];

/** Human label for an extraction's detectedDocumentType (incl. "unknown"). */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  isp: "ISP (Individualized Service Plan)",
  poc: "Plan of Care",
  pcpt: "PCPT",
  sdr: "SDR",
  bsp: "Behavior Plan / BSP",
  medicalDocs: "Medical Documents",
  consents: "Consents and Releases",
  physicianOrders: "Physician Orders",
  insuranceCards: "Insurance Cards",
  medicaidCard: "Medicaid Card",
  medicareCard: "Medicare Card",
  idCard: "ID Card",
  guardianshipDocs: "Guardianship / POA Documents",
  assessmentForms: "Assessment Forms",
  clinicalAssessment: "Clinical Assessment",
  form485: "Form 485",
  hospitalDischarge: "Hospital Discharge Papers",
  unknown: "Not detected",
};

/** Friendly labels for low-confidence extraction field paths. */
export const FIELD_LABELS: Record<string, string> = {
  "stage1.firstName": "First name",
  "stage1.lastName": "Last name",
  "stage1.middleName": "Middle name",
  "stage1.gender": "Gender",
  "stage1.dob": "Date of birth",
  "stage1.medicaidId": "Medicaid ID",
  "stage1.dddId": "DDD ID",
  "stage1.medicareId": "Medicare ID",
  "stage1.preferredName": "Preferred name",
  "stage1.maritalStatus": "Marital status",
  "stage1.referralInfo.source": "Referral source",
  "stage1.referralInfo.organization": "Referring organization",
  "stage2.hhaServiceRequest.requestedServices": "Requested services",
  "stage2.hhaAuthorizations": "HHA authorizations",
  "stage3.physicianInfo.name": "Physician name",
  "stage3.fallRisk": "Fall risk",
  "stage1.ssn": "Social Security number",
  "stage1.address": "Address",
  "stage1.countyState": "County / state",
  "stage1.zipCode": "ZIP code",
  "stage1.phone": "Phone",
  "stage1.email": "Email",
  "stage1.language": "Language",
  "stage1.communicationMethod": "Communication method",
  "stage2.guardianName": "Guardian name",
  "stage2.guardianRelationship": "Guardian relationship",
  "stage2.guardianEmail": "Guardian email",
  "stage2.guardianPhone": "Guardian phone",
  "stage2.supportCoordinatorName": "Support coordinator name",
  "stage2.supportCoordinatorAgency": "Support coordinator agency",
  "stage2.supportCoordinatorContact": "Support coordinator contact",
  "stage3.medicalConditions": "Medical conditions",
  "stage3.allergies": "Allergies",
  "stage3.dietaryRestrictions": "Dietary restrictions",
  "stage6.emergencyName": "Emergency contact name",
  "stage6.primaryPhone": "Emergency primary phone",
  "stage6.secondaryPhone": "Emergency secondary phone",
  "stage6.hospitalPreference": "Hospital preference",
};

export function humanizeLastSegment(path: string): string {
  const seg = path.split(".").pop() ?? path;
  const spaced = seg.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function labelForFieldConfidence(f: FieldConfidence): string {
  const p = f.path ?? "";
  return FIELD_LABELS[p] ?? f.label?.trim() ?? humanizeLastSegment(p);
}
