import { createClientWithReview, updateClient, uploadClientDocument, type ClientDocument, type CreateClientRequest } from "@/lib/api/clients";
import { extractClientHhaPocClinicalViaApi, extractClientIspViaApi } from "@/lib/api/gemini";
import { extractScClientOnboardingViaApi } from "@/lib/api/sc-client-extraction";
import { fetchFirstPlaceDetailsForQuery } from "@/hooks/useGooglePlacesAutocomplete";
import type { ClientExtractionResponse } from "../types/clientExtraction";
import type { AddClientFormData, DocKey } from "../types/formData";
import type { ScClientExtractionBatch } from "../types/scClientExtraction";
import { withoutGuessedSlot } from "../components/ClientImportFromFilePanel";
import { buildFolderImportFormData, type FolderImportClient, type FolderImportMode } from "./folderImport";
import { mergeExtractionDraft, type MergeExtractionOptions } from "./mergeExtractionDraft";
import { formDataToApiPayload, hhaAuthorizationRowMissingPayFields, isMeaningfulHhaAuthorizationRow } from "./formDataToApiPayload";
import { handleDocumentUploads } from "./documentUploadHandler";
import { hasClientDocumentEdits, preflightClientDocumentEdits } from "./clientDocumentEdits";
import { formatGeminiExtractError } from "./formatGeminiExtractError";
import { matchScExtractedAddress } from "./matchScExtractedAddress";
import { mergeScExtractionBatch } from "./mergeScExtractionBatch";
import type { ScImportFormValues } from "./mergeScExtractionDraft";
import { mergeScPendingDocuments, toScClientDocument } from "./scEnrollmentDocuments";

export type FolderCreateOptions = {
  folderName: string;
  signal?: AbortSignal;
  hhaServices?: MergeExtractionOptions["hhaServices"];
  onProgress?: (message: string) => void;
};

export type FolderCreateResult = {
  clientId: string;
  name: string;
  /** What a person should check on the new client. Saved with the client's review marker. */
  notes: string[];
  /** Set when the client was saved but some files did not upload. */
  documentError?: string;
};

const MAX_NOTES = 30;
const MAX_NOTE_LENGTH = 300;

/** The client was not created; `message` says why and the user can still use the form. */
export class FolderCreateError extends Error {}

function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Import cancelled", "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError" || (error as { code?: string } | null)?.code === "ERR_CANCELED";
}

function readError(fileNames: string[], error: unknown): FolderCreateError {
  if (isAbortError(error)) throw error;
  const reason = formatGeminiExtractError(error) || "The documents could not be read.";
  return new FolderCreateError(`${fileNames.join(", ")}: ${reason}`);
}

export function cleanNotes(notes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of notes) {
    const note = raw.replace(/\s+/g, " ").trim();
    if (!note || seen.has(note.toLowerCase())) continue;
    seen.add(note.toLowerCase());
    out.push(note.length > MAX_NOTE_LENGTH ? `${note.slice(0, MAX_NOTE_LENGTH - 1)}…` : note);
    if (out.length === MAX_NOTES) break;
  }
  return out;
}

/** Folder names are usually the client's name ("Jane Doe" or "Doe, Jane"). */
export function nameFromFolder(folderName: string): { firstName: string; lastName: string } {
  const clean = folderName.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (clean.includes(",")) {
    const [last, first] = clean.split(",", 2).map(part => part.trim());
    if (first && last) return { firstName: first, lastName: last };
  }
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length < 2) return { firstName: clean, lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const warningsOf = (extraction: ClientExtractionResponse) => (extraction.warnings ?? []).map(warning => warning.message);

/** Attach the file to a slot unless it is already there, keeping other files in that slot. */
function ensureAttached(formData: AddClientFormData, key: DocKey, file: File): AddClientFormData {
  return {
    ...formData,
    stage3: {
      ...formData.stage3,
      docs: formData.stage3.docs.map(doc => {
        if (doc.key !== key || doc.file === file || doc.files?.includes(file)) return doc;
        const files = [...(doc.files ?? (doc.file ? [doc.file] : [])), file];
        return { ...doc, file: files[0], files: files.length > 1 ? files : undefined, fileName: files.map(f => f.name).join(", ") };
      }),
    },
  };
}

/** Same lookup the add-client form runs for an imported address, without the form. */
async function geocodeImportedAddress(formData: AddClientFormData, signal?: AbortSignal): Promise<AddClientFormData> {
  if (!formData._pendingImportedPrimaryGeocode) return formData;
  const next: AddClientFormData = { ...formData };
  delete next._pendingImportedPrimaryGeocode;
  const street = String(formData.stage1.address ?? "").trim();
  if (street.length < 3) return next;
  const extras = [formData.stage1.countyState, formData.stage1.zipCode]
    .map(part => String(part ?? "").replace(/\s*\/\s*/g, ", ").trim())
    .filter(part => part && !street.toLowerCase().includes(part.toLowerCase()));
  const details = await fetchFirstPlaceDetailsForQuery([street, ...extras].join(", "), { signal }).catch(error => {
    if (isAbortError(error)) throw error;
    return null;
  });
  abortIfNeeded(signal);
  if (!details || String(details.countryCode).toUpperCase() !== "US") return next;
  const line2 = details.line2?.trim().replace(/\s+/g, " ") || null;
  return {
    ...next,
    stage1: {
      ...next.stage1,
      address: details.formattedAddress,
      location: { lat: String(details.lat), lon: String(details.lng) },
      countyState: details.county && details.stateLong ? `${details.county} / ${details.stateLong}` : details.county || details.stateLong,
      zipCode: details.zipCode,
      line1: details.line1.trim().replace(/\s+/g, " "),
      line2: line2 ?? next.stage1.line2,
      city: details.city.trim().replace(/\s+/g, " "),
      state: (details.stateCode || details.state).trim().toUpperCase(),
      postalCode: details.zipCode.trim().toUpperCase(),
      country: (details.countryCode || details.country).trim().toUpperCase(),
      homeInfo: { ...(next.stage1.homeInfo ?? {}), apartmentNumber: line2 ?? next.stage1.line2 ?? undefined },
    },
  };
}

/** Things the documents did not give, worded for the person reviewing the client. */
export function reviewNotesFor(formData: AddClientFormData, mode: "ddd" | "hha"): string[] {
  const s1 = formData.stage1;
  const notes: string[] = [];
  if (!s1.dob) notes.push("Date of birth was not found in the documents.");
  if (!s1.medicaidId?.trim()) notes.push("Medicaid ID was not found in the documents.");
  if (mode === "ddd" && !s1.dddId?.trim()) notes.push("DDD client ID was not found in the documents.");
  if (!s1.location?.lat || !s1.location?.lon) notes.push("The address could not be matched on the map. Pick it from the suggestions in the profile so visit locations can be checked.");
  if (mode === "ddd") {
    const services = formData.stage2.outcomes.flatMap(outcome => outcome.services);
    if (!services.some(service => service.code?.trim() && service.name?.trim())) notes.push("No service authorizations with a code and name were found.");
    if (!s1.tier) notes.push("No DDD tier was found.");
  } else {
    const rows = (formData.stage2.hhaAuthorizations ?? []).filter(isMeaningfulHhaAuthorizationRow);
    // Saved HHA authorizations need a staff rate and pay type, which documents don't give.
    const held = rows.filter(hhaAuthorizationRowMissingPayFields);
    if (!rows.length) notes.push("No authorizations matching your HHA services were found.");
    if (held.length) notes.push(`Not saved, add a staff rate and pay type and re-enter: ${held.map(row => [row.serviceCode || row.serviceName, row.authorizationNumber && `auth ${row.authorizationNumber}`, row.approvedHours && `${row.approvedHours} hrs`].filter(Boolean).join(" ")).join("; ")}.`);
    if (!formData.stage3.docs.some(doc => doc.key === "form485" && (doc.file || doc.files?.length))) notes.push("Upload the signed Form 485 before activating the client.");
  }
  if (formData.acuityRequirements?.enabled) notes.push("Acuity was found in the ISP. Choose Medication, Behavioral, or Both and upload the AENF before activating.");
  if (mode === "ddd") notes.push("Staff rates and pay types are not in the documents. Add them before scheduling.");
  return notes;
}

async function createDddOrHhaClient(client: FolderImportClient, mode: "ddd" | "hha", options: FolderCreateOptions): Promise<FolderCreateResult> {
  const { signal } = options;
  let { formData, unattached } = buildFolderImportFormData(client, mode);
  let notes: string[] = [];
  const { file, poc, clinicalAssessment } = client.autofillFiles;
  if (mode === "ddd") {
    if (!file) throw new FolderCreateError("No document to read was found in this folder.");
    options.onProgress?.(`Reading ${file.name}`);
    let extraction: ClientExtractionResponse;
    try {
      extraction = await extractClientIspViaApi(file, { type: "ddd", signal });
    } catch (error) {
      throw readError([file.name], error);
    }
    abortIfNeeded(signal);
    const merged = mergeExtractionDraft(withoutGuessedSlot(formData, file, extraction.detectedDocumentType), extraction, { overwrite: true, importFile: file });
    formData = merged.formData;
    notes.push(...warningsOf(extraction), ...merged.localWarnings);
  } else {
    if (!poc && !clinicalAssessment) throw new FolderCreateError("No Plan of Care or Clinical Assessment was found in this folder.");
    const names = [poc, clinicalAssessment].filter((f): f is File => Boolean(f)).map(f => f.name);
    options.onProgress?.(`Reading ${names.join(" and ")}`);
    let extraction: ClientExtractionResponse;
    try {
      extraction = await extractClientHhaPocClinicalViaApi({ poc, clinicalAssessment }, { signal });
    } catch (error) {
      throw readError(names, error);
    }
    abortIfNeeded(signal);
    const merged = mergeExtractionDraft(formData, extraction, { overwrite: true, hhaServices: options.hhaServices ?? [] });
    formData = merged.formData;
    if (poc) formData = ensureAttached(formData, "poc", poc);
    if (clinicalAssessment) formData = ensureAttached(formData, "clinicalAssessment", clinicalAssessment);
    notes.push(...warningsOf(extraction), ...merged.localWarnings);
  }
  // The client is created as HHA/DDD even if the reader guessed the other program.
  formData = { ...formData, type: mode };
  if (!formData.stage1.firstName?.trim() && !formData.stage1.lastName?.trim()) {
    formData = { ...formData, stage1: { ...formData.stage1, ...nameFromFolder(client.name) } };
    notes.unshift(`The name was not found in the documents, so the folder name "${client.name}" was used.`);
  }
  options.onProgress?.("Matching the address");
  formData = await geocodeImportedAddress(formData, signal);
  const located = Boolean(formData.stage1.location?.lat && formData.stage1.location?.lon);
  const serverAcuityNote = notes.some(note => /^Acuity requirement turned on/i.test(note));
  notes = notes.filter(note => !(located && /without verified geocode/i.test(note)));
  notes.push(...reviewNotesFor(formData, mode).map(note => serverAcuityNote && note.startsWith("Acuity was found in the ISP.") ? "Choose Medication, Behavioral, or Both for Acuity and upload the AENF before activating." : note));
  if (unattached.length) notes.push(`Not attached, add them from the profile if needed: ${unattached.join(", ")}`);

  preflightClientDocumentEdits(formData.stage3);
  const { documents: _documents, ...payload } = formDataToApiPayload(formData, false, true, false);
  const reviewNotes = cleanNotes(notes);
  abortIfNeeded(signal);
  options.onProgress?.("Saving the client");
  const response = await createClientWithReview({ ...payload, importReview: { source: "folder_upload", folderName: options.folderName, notes: reviewNotes } });
  const clientId = response.data.id;
  if (!clientId) throw new FolderCreateError("The client save did not return an ID. Check the client list before trying again.");
  const name = `${formData.stage1.firstName || ""} ${formData.stage1.lastName || ""}`.trim() || client.name;
  let documentError: string | undefined;
  if (hasClientDocumentEdits(formData.stage3)) {
    options.onProgress?.("Uploading documents");
    try {
      const documents = await handleDocumentUploads(clientId, formData);
      await updateClient(clientId, { documents });
    } catch {
      documentError = "Some documents did not upload. Add them from the client profile.";
    }
  }
  return { clientId, name, notes: reviewNotes, documentError };
}

const emptyScForm = (): ScImportFormValues => ({
  program: "", firstName: "", middleName: "", lastName: "", dob: "", gender: "", ssn: "",
  address: "", city: "", county: "", state: "", zip: "", phone: "", email: "", medicaidId: "", dddId: "",
  periodStartDate: "", periodEndDate: "", guardianName: "", guardianRelationship: "", guardianPhone: "",
  guardianEmail: "", guardianAddress: "", familyMemberName: "", familyMemberRelationship: "", addressSearch: "",
  outcomes: [], hasGuardian: false, familyMemberParticipates: false,
});

async function createScClient(client: FolderImportClient, options: FolderCreateOptions): Promise<FolderCreateResult> {
  const { signal } = options;
  const entries = Object.entries(client.autofillFiles);
  if (!entries.length) throw new FolderCreateError("No document to read was found in this folder.");
  const documents: ScClientExtractionBatch["documents"] = [];
  const failed: string[] = [];
  for (const [index, [fileKey, file]] of entries.entries()) {
    options.onProgress?.(`Reading ${index + 1} of ${entries.length}: ${file.name}`);
    try {
      const result = await extractScClientOnboardingViaApi(file, { signal });
      abortIfNeeded(signal);
      const addressMatch = await matchScExtractedAddress(result.draft, { signal: signal ?? new AbortController().signal });
      documents.push({ fileKey, addressMatch, extraction: { ...result, sourceDocument: { ...result.sourceDocument, fileName: file.name } } });
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw error;
      failed.push(`${file.name}: ${formatGeminiExtractError(error) || "could not be read"}`);
    }
  }
  if (!documents.length) throw new FolderCreateError(failed.join(" "));
  const merged = mergeScExtractionBatch(emptyScForm(), documents, { overwrite: true });
  if (merged.blocked) throw new FolderCreateError("The documents in this folder seem to belong to different people. Open the enrollment form to check them.");
  const form = merged.form;
  const notes = [...merged.warnings, ...failed.map(item => `Not read: ${item}`)];
  if (!form.firstName.trim() && !form.lastName.trim()) {
    Object.assign(form, nameFromFolder(client.name));
    notes.unshift(`The name was not found in the documents, so the folder name "${client.name}" was used.`);
  }
  if (!form.dob) notes.push("Date of birth was not found in the documents.");
  if (!form.medicaidId) notes.push("Medicaid ID was not found in the documents.");
  if (!form.dddId) notes.push("DDD client ID was not found in the documents.");
  if (!form.address || !form.city || !form.state || !form.zip) notes.push("A complete address was not found or matched. Pick it from the suggestions in the profile.");
  if (!form.periodStartDate || !form.periodEndDate) notes.push("The ISP period dates were not found.");
  if (form.program) notes.push(`The documents mention the ${form.program} program. Confirm it in the enrollment form.`);
  notes.push("The enrollment agreement, eligibility checks, and signatures still need to be completed in the enrollment form.");
  const reviewNotes = cleanNotes(notes);
  const hasGuardian = Boolean(form.guardianName.trim());
  const payload: CreateClientRequest = {
    type: "ddd", servicePrograms: ["sc"], status: "pending",
    importReview: { source: "folder_upload", folderName: options.folderName, notes: reviewNotes },
    firstName: form.firstName.trim(), middleName: form.middleName.trim() || undefined, lastName: form.lastName.trim(),
    dateOfBirth: form.dob || undefined, gender: form.gender || undefined, ssn: form.ssn.trim() || undefined,
    phone: form.phone.trim() || undefined, email: form.email.trim() || undefined,
    medicaidId: form.medicaidId.trim() || undefined, dddId: form.dddId.trim() || undefined,
    countyState: form.county.trim() || undefined,
    ...(form.address && form.city && form.state && form.zip ? {
      primaryAddress: { address: form.addressSearch.trim() || [form.address, form.city, `${form.state} ${form.zip}`].join(", "), line1: form.address.trim(), city: form.city.trim(), state: form.state.trim(), postalCode: form.zip.trim(), zipCode: form.zip.trim(), countyState: form.county.trim() || undefined, country: "US" },
    } : {}),
    ...(hasGuardian ? {
      guardianName: form.guardianName.trim(), guardianRelationship: form.guardianRelationship || undefined,
      guardianPhone: form.guardianPhone.trim() || undefined, guardianEmail: form.guardianEmail.trim() || undefined, guardianAddress: form.guardianAddress.trim() || undefined,
    } : {}),
    ...(form.periodStartDate && form.periodEndDate && form.periodEndDate >= form.periodStartDate ? { ispPeriod: { startDate: form.periodStartDate, endDate: form.periodEndDate } } : {}),
    scOutcomes: form.outcomes.map(outcome => ({ ...outcome, statement: outcome.statement.trim() })).filter(outcome => outcome.statement),
  };
  abortIfNeeded(signal);
  options.onProgress?.("Saving the client");
  const created = await createClientWithReview(payload);
  const clientId = created.data.id;
  if (!clientId) throw new FolderCreateError("The client save did not return an ID. Check the client list before trying again.");
  // Every supported file in the folder is attached, typed by what the reader found.
  const pending = mergeScPendingDocuments([], client.files.map(({ file }) => ({
    file,
    documentType: documents.find(document => client.autofillFiles[document.fileKey] === file)?.extraction.detectedDocumentType ?? "other",
  })));
  const uploaded: ClientDocument[] = [];
  const missing: string[] = [];
  if (pending.length) options.onProgress?.("Uploading documents");
  for (const item of pending) {
    try {
      uploaded.push(toScClientDocument(item, await uploadClientDocument(clientId, "support-coordination", item.file)));
    } catch {
      missing.push(item.file.name);
    }
  }
  if (uploaded.length) {
    try { await updateClient(clientId, { documents: uploaded }); } catch { missing.push("document links"); }
  }
  const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || client.name;
  return { clientId, name, notes: reviewNotes, documentError: missing.length ? `Not attached: ${missing.join(", ")}. Add them from the client profile.` : undefined };
}

/**
 * Read one client's folder and create the client straight away, without the form.
 * The client is saved as pending with a review marker listing what to check.
 */
export async function createClientFromFolder(client: FolderImportClient, mode: FolderImportMode, options: FolderCreateOptions): Promise<FolderCreateResult> {
  abortIfNeeded(options.signal);
  if (!client.files.length) throw new FolderCreateError("This folder has no supported documents.");
  return mode === "sc" ? createScClient(client, options) : createDddOrHhaClient(client, mode, options);
}
