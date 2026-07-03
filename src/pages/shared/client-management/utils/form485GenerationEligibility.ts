import type { AddClientFormData, DocState } from "../types/formData";
import type { ClientDocument, ClientType } from "@/lib/api/clients";
import { buildPocFormContext } from "./buildPocFormContext";
import { stableJsonStringify } from "./stableJsonStringify";
import { getDocByKey, hasDocSource } from "./pocGenerationEligibility";

/** Form 485 generation is an HHA-only feature gated behind the AI builder flag. */
export function canShowForm485Generate(formData: AddClientFormData): boolean {
  return formData.type === "hha" && formData.stage7.aiPlanOfCareBuilder;
}

/** Generation needs BOTH a Plan of Care and a Clinical Assessment source. */
export function canGenerateForm485(formData: AddClientFormData): boolean {
  const poc = getDocByKey(formData.stage3.docs, "poc");
  const clinical = getDocByKey(formData.stage3.docs, "clinicalAssessment");
  return hasDocSource(poc) && hasDocSource(clinical);
}

export function hasForm485Document(formData: AddClientFormData): boolean {
  return hasDocSource(getDocByKey(formData.stage3.docs, "form485"));
}

/**
 * True when a saved client has an uploaded Form 485 — a persisted document with
 * a real URL. Operates on the Client.documents shape (unlike hasForm485Document,
 * which inspects the wizard's in-progress stage3 docs).
 */
export function hasUploadedForm485(
  documents?: ClientDocument[] | null,
): boolean {
  return Boolean(
    documents?.some((d) => d.key === "form485" && Boolean(d.url?.trim())),
  );
}

/**
 * True when a saved client has an uploaded Form 485 that counts as signed.
 * `signed` reads as signed unless explicitly false, so legacy 485s persisted
 * before this feature (no `signed` field) are grandfathered as signed.
 */
export function hasSignedForm485(
  documents?: ClientDocument[] | null,
): boolean {
  return Boolean(
    documents?.some(
      (d) => d.key === "form485" && Boolean(d.url?.trim()) && d.signed !== false,
    ),
  );
}

/**
 * HHA clients can only be activated once an approved Form 485 is uploaded, so an
 * HHA client without one is "Form 485 required" — and must never read as active.
 */
export function isForm485Required(client: {
  type?: ClientType;
  documents?: ClientDocument[] | null;
}): boolean {
  return client.type === "hha" && !hasUploadedForm485(client.documents);
}

/** Days an unsigned Form 485 keeps an HHA client active before deactivation. */
export const FORM485_GRACE_DAYS = 14;
const FORM485_DAY_MS = 24 * 60 * 60 * 1000;

type Firestoreish =
  | string
  | number
  | Date
  | { _seconds?: number; _nanoseconds?: number }
  | null
  | undefined;

function toMillis(value: Firestoreish): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value._seconds === "number") return value._seconds * 1000;
  return null;
}

export type Form485GraceState = "none" | "unsigned-grace" | "signed" | "expired";

export interface Form485GraceInfo {
  state: Form485GraceState;
  /** Whole days remaining before deactivation (only for "unsigned-grace"). */
  daysLeft?: number;
  /** When the unsigned grace ends (for "unsigned-grace" and "expired"). */
  deadline?: Date;
}

/**
 * Describes an HHA client's Form 485 activation state for UI messaging:
 *  - "none": no uploaded 485 (still "Form 485 required").
 *  - "signed": a signed 485 is on file (permanently satisfied).
 *  - "unsigned-grace": active on an unsigned 485 within the 14-day window.
 *  - "expired": the unsigned grace lapsed (client deactivated to pending).
 * Non-HHA clients are always "none".
 */
export function form485GraceInfo(client: {
  type?: ClientType;
  documents?: ClientDocument[] | null;
  form485UnsignedActivatedAt?: Firestoreish;
}): Form485GraceInfo {
  if (client.type !== "hha") return { state: "none" };
  if (hasSignedForm485(client.documents)) return { state: "signed" };
  if (!hasUploadedForm485(client.documents)) return { state: "none" };

  // Unsigned 485 uploaded. Without a started clock the client hasn't been
  // activated provisionally yet, so report grace with no countdown.
  const startedAt = toMillis(client.form485UnsignedActivatedAt);
  if (startedAt == null) return { state: "unsigned-grace" };

  const deadlineMs = startedAt + FORM485_GRACE_DAYS * FORM485_DAY_MS;
  const now = Date.now();
  if (now >= deadlineMs) return { state: "expired", deadline: new Date(deadlineMs) };
  return {
    state: "unsigned-grace",
    daysLeft: Math.ceil((deadlineMs - now) / FORM485_DAY_MS),
    deadline: new Date(deadlineMs),
  };
}

/** Labels of the source documents still missing (for the disabled-button hint). */
export function getForm485MissingSources(formData: AddClientFormData): string[] {
  const missing: string[] = [];
  if (!hasDocSource(getDocByKey(formData.stage3.docs, "poc"))) {
    missing.push("Plan of Care");
  }
  if (!hasDocSource(getDocByKey(formData.stage3.docs, "clinicalAssessment"))) {
    missing.push("Clinical Assessment");
  }
  return missing;
}

/** Stable cache key so identical inputs don't re-call Gemini. */
export function buildForm485GenerationInputSignature(
  formData: AddClientFormData,
  clientId?: string,
): string {
  const poc = getDocByKey(formData.stage3.docs, "poc");
  const clinical = getDocByKey(formData.stage3.docs, "clinicalAssessment");
  const part = (d: DocState | undefined) =>
    d?.file ? `file:${d.file.name}:${d.file.size}` : d?.url ? `url:${d.url}` : "";
  const ctx = stableJsonStringify(buildPocFormContext(formData));
  return [clientId ?? "", part(poc), part(clinical), ctx].join("|");
}
