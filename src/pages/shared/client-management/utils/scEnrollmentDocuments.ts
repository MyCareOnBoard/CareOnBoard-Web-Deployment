import type { ClientDocument, ClientDocumentUploadResult } from "@/lib/api/clients";
import { SC_DOCUMENT_CATEGORIES } from "@/lib/sc-client-documents";
import type { ScClientExtractionResponse } from "../types/scClientExtraction";

const allowedFileTypes = new Set(["application/pdf", "application/x-pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]);
const maxFileBytes = 10 * 1024 * 1024;

export type ScPendingDocument = {
  file: File;
  documentType: ScClientExtractionResponse["detectedDocumentType"];
  category: NonNullable<ClientDocument["category"]>;
  title: string;
  source: string;
  provider: string;
  issuedOnDate: string;
  expiryDate: string;
};

export function createScPendingDocument(file: File, documentType: ScPendingDocument["documentType"] = "other"): ScPendingDocument {
  const category = documentType === "isp" ? "ISP" : documentType === "njcat" ? "Assessment"
    : documentType === "tierLetter" ? "Tier" : documentType === "enrollment" ? "Enrollment" : "Other";
  return { file, documentType, category, title: file.name.trim().slice(0, 120), source: "", provider: "", issuedOnDate: "", expiryDate: "" };
}

export function mergeScPendingDocuments(previous: ScPendingDocument[], additions: Array<{ file: File; documentType?: ScPendingDocument["documentType"] }>): ScPendingDocument[] {
  const next = [...previous];
  for (const { file, documentType } of additions) {
    const index = next.findIndex(document => document.file.name === file.name && document.file.size === file.size && document.file.lastModified === file.lastModified);
    if (index < 0) next.push(createScPendingDocument(file, documentType));
    else if (documentType && documentType !== "other" && documentType !== "unknown") next[index] = { ...next[index], documentType };
  }
  return next;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function scPendingDocumentsError(documents: ScPendingDocument[]): string | null {
  for (const [index, document] of documents.entries()) {
    const label = `Document ${index + 1}`;
    if (!(document.file instanceof File)) return `${label}: Choose a file.`;
    if (!document.file.size) return `${label}: The file is empty. Choose a nonempty file.`;
    if (document.file.size > maxFileBytes) return `${label}: Choose a file up to 10 MB.`;
    if (!allowedFileTypes.has(document.file.type.toLowerCase())) return `${label}: Choose a PDF, JPEG, PNG, or WebP file.`;
    if (!document.title.trim()) return `${label}: Enter a document name.`;
    if (document.title.trim().length > 120) return `${label}: Document name must be 120 characters or fewer.`;
    if (!SC_DOCUMENT_CATEGORIES.includes(document.category)) return `${label}: Select a valid document type.`;
    if (document.source.trim().length > 100) return `${label}: Source must be 100 characters or fewer.`;
    if (document.provider.trim().length > 120) return `${label}: Related provider must be 120 characters or fewer.`;
    const issued = document.issuedOnDate.trim(), expiry = document.expiryDate.trim();
    if (issued && !validDate(issued)) return `${label}: Select a valid effective date.`;
    if (expiry && !validDate(expiry)) return `${label}: Select a valid expiration date.`;
    if (issued && expiry && expiry < issued) return `${label}: Expiration date must be on or after the effective date.`;
  }
  return null;
}

export function toScClientDocument(document: ScPendingDocument, uploaded: ClientDocumentUploadResult): ClientDocument {
  const result: ClientDocument = { key: "scDocuments", title: document.title.trim(), fileName: uploaded.fileName, url: uploaded.url, category: document.category };
  for (const key of ["source", "provider", "issuedOnDate", "expiryDate"] as const) {
    const value = document[key].trim();
    if (value) result[key] = value;
  }
  return result;
}
