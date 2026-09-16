import { format, isValid, parseISO } from "date-fns";
import type { ClientDocument, ClientDocumentKey } from "@/lib/api/clients";
import type { DocState, Stage3HealthcareAndDocumentsData } from "../types/formData";

const TRACKED_DOCUMENT_KEYS = new Set<ClientDocumentKey>(["isp", "pcpt", "sdr", "form485", "poc", "physicianOrders", "clinicalAssessment"]);
const RELOAD_MESSAGE = "Document records changed or could not be loaded. Reload the client and review the files before saving documents.";

export function parseClientDocumentDate(raw?: string): Date | undefined {
  if (typeof raw !== "string") return undefined;
  const date = parseISO(raw);
  return isValid(date) ? date : undefined;
}

export function serializeClientDocumentDate({ key, original, selected, edited }: {
  key: ClientDocumentKey; original?: string; selected?: Date; edited: boolean;
}): string | undefined {
  if (!edited) return original;
  if (!selected) return undefined;
  if (!isValid(selected)) throw new Error("Select a valid document date before saving.");
  return TRACKED_DOCUMENT_KEYS.has(key) ? format(selected, "yyyy-MM-dd") : selected.toISOString();
}

function dateEdited(doc: DocState, field: "issuedOnDate" | "expiryDate"): boolean {
  if (doc.editedDates?.[field]) return true;
  // Imported/generated dates have no Calendar event; compare to the loaded display value.
  return !!doc[field] && doc[field]?.getTime() !== parseClientDocumentDate(doc.originalDocument?.[field])?.getTime();
}

export function hasClientDocumentEdit(doc: DocState): boolean {
  return !!(doc.file || doc.files?.length || dateEdited(doc, "issuedOnDate") || dateEdited(doc, "expiryDate") ||
    (doc.originalDocument && (doc.autoReminder !== (doc.originalDocument.autoReminder ?? true) || doc.signed !== doc.originalDocument.signed)));
}

export function hasClientDocumentEdits(stage3: Stage3HealthcareAndDocumentsData): boolean {
  return stage3.docs.some(hasClientDocumentEdit);
}

export function clientDocumentReplacement(doc: DocState): ClientDocument {
  const original = doc.originalDocument;
  const issuedEdited = dateEdited(doc, "issuedOnDate");
  const expiryEdited = dateEdited(doc, "expiryDate");
  const replacement: ClientDocument = original ? { ...original } : { key: doc.key, title: doc.title, url: doc.url, fileName: doc.fileName, autoReminder: doc.autoReminder };
  for (const [field, edited] of [["issuedOnDate", issuedEdited], ["expiryDate", expiryEdited]] as const) {
    if (!edited) continue;
    const value = serializeClientDocumentDate({ key: doc.key, original: original?.[field], selected: doc[field], edited });
    if (value === undefined) delete replacement[field];
    else replacement[field] = value;
  }
  validateClientDocumentDates(replacement, issuedEdited || expiryEdited);
  if (!original || doc.autoReminder !== (original.autoReminder ?? true)) replacement.autoReminder = doc.autoReminder;
  if (doc.key === "form485" && doc.signed !== original?.signed) replacement.signed = doc.signed;
  return replacement;
}

export function validateClientDocumentDates(document: ClientDocument, edited: boolean): void {
  if (!edited) return;
  const issued = parseClientDocumentDate(document.issuedOnDate);
  const expiry = parseClientDocumentDate(document.expiryDate);
  if (issued && expiry && format(issued, "yyyy-MM-dd") > format(expiry, "yyyy-MM-dd")) {
    throw new Error("Document expiry date must be on or after its issued date.");
  }
}

export function mergeClientDocumentEdit({ originalDocuments, originalDocument, replacement }: {
  originalDocuments: ClientDocument[]; originalDocument?: ClientDocument; replacement: ClientDocument;
}): ClientDocument[] {
  if (!Array.isArray(originalDocuments)) throw new Error(RELOAD_MESSAGE);
  if (!originalDocument) return [...originalDocuments, replacement];
  const matches = originalDocuments.filter(doc => doc && doc.key === originalDocument.key &&
    (originalDocument.url ? doc.url === originalDocument.url : !!originalDocument.fileName && doc.fileName === originalDocument.fileName));
  if (matches.length !== 1) throw new Error(RELOAD_MESSAGE);
  return originalDocuments.map(doc => doc === matches[0] ? replacement : doc);
}

export function preflightClientDocumentEdits(stage3: Stage3HealthcareAndDocumentsData): void {
  if (!hasClientDocumentEdits(stage3)) return;
  if (!Array.isArray(stage3.originalDocuments)) throw new Error(RELOAD_MESSAGE);
  for (const doc of stage3.docs.filter(hasClientDocumentEdit)) {
    mergeClientDocumentEdit({ originalDocuments: stage3.originalDocuments, originalDocument: doc.originalDocument, replacement: clientDocumentReplacement(doc) });
  }
}

export function refreshClientDocumentBaseline(stage3: Stage3HealthcareAndDocumentsData, documents: ClientDocument[]): Stage3HealthcareAndDocumentsData {
  return { ...stage3, originalDocuments: documents, docs: stage3.docs.map(doc => {
    const originalIndex = doc.originalDocument ? stage3.originalDocuments?.indexOf(doc.originalDocument) ?? -1 : -1;
    const saved = originalIndex >= 0 ? documents[originalIndex] : documents.find(candidate => candidate?.key === doc.key && !stage3.originalDocuments?.includes(candidate));
    if (!saved) return doc;
    return { ...doc, originalDocument: saved, file: undefined, files: undefined, editedDates: undefined,
      url: saved.url, fileName: saved.fileName, issuedOnDate: parseClientDocumentDate(saved.issuedOnDate), expiryDate: parseClientDocumentDate(saved.expiryDate),
      autoReminder: saved.autoReminder ?? true, signed: saved.signed };
  }) };
}
