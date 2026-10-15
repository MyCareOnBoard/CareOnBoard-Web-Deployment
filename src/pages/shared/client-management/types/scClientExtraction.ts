import type { ExtractionWarning, FieldConfidence } from "./clientExtraction";

export type ScImportStringField =
  | "program" | "firstName" | "middleName" | "lastName" | "dob" | "gender" | "ssn"
  | "address" | "city" | "county" | "state" | "zip" | "phone" | "email" | "medicaidId" | "dddId"
  | "periodStartDate" | "periodEndDate" | "guardianName" | "guardianRelationship" | "guardianPhone"
  | "guardianEmail" | "guardianAddress" | "familyMemberName" | "familyMemberRelationship";

export type ScClientExtractionDraft = Partial<Record<ScImportStringField, string>> & { outcomes?: string[] };

export interface ScClientExtractionResponse {
  detectedDocumentType: "isp" | "njcat" | "dddApplication" | "enrollment" | "tierLetter" | "guardianship" | "pcpt" | "other" | "unknown";
  draft: ScClientExtractionDraft;
  fieldConfidences: Array<FieldConfidence & { page?: number }>;
  warnings: ExtractionWarning[];
  sourceDocument: { fileName: string; mimeType: string; fileSize: number; model?: string };
  extractionJobId?: string;
}

export interface ScClientExtractionDocument {
  fileKey: string;
  extraction: ScClientExtractionResponse;
}

export interface ScClientExtractionBatch {
  documents: ScClientExtractionDocument[];
}
