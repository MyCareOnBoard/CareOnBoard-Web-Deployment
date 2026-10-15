import type { ClientOutcome } from "@/lib/api/clients";
import type { ScClientExtractionResponse, ScImportStringField } from "../types/scClientExtraction";

export type ScImportFormValues = Record<ScImportStringField | "addressSearch", string> & {
  outcomes: ClientOutcome[];
  hasGuardian?: boolean;
  familyMemberParticipates?: boolean;
};

export interface ScImportPreviewRow {
  key: string;
  label: string;
  currentValue: string;
  extractedValue: string;
  willApply: boolean;
}

const labels: Record<ScImportStringField | "addressSearch", string> = {
  program: "Program", firstName: "First name", middleName: "Middle name", lastName: "Last name", dob: "Date of birth", gender: "Gender", ssn: "SSN",
  addressSearch: "Primary address", address: "Street address", city: "City", county: "County", state: "State", zip: "ZIP code", phone: "Phone", email: "Email", medicaidId: "Medicaid ID", dddId: "DDD client ID",
  periodStartDate: "ISP start date", periodEndDate: "ISP end date", guardianName: "Guardian name", guardianRelationship: "Guardian relationship", guardianPhone: "Guardian phone", guardianEmail: "Guardian email", guardianAddress: "Guardian address",
  familyMemberName: "Family member name", familyMemberRelationship: "Family member relationship",
};
const addressFields = ["address", "city", "county", "state", "zip"] as const;
const dateFields = ["periodStartDate", "periodEndDate"] as const;
const identityFields = ["dddId", "medicaidId", "dob", "ssn"] as const;
const nameFields = ["firstName", "middleName", "lastName"] as const;

function text(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || /^(?:unknown|n\/?a|none|null|undefined|not (?:provided|specified|available|known|applicable)|redacted|withheld|[-_?]+)$/i.test(trimmed) || /[*•]/.test(trimmed) || (/x{2,}/i.test(trimmed) && /^[x\d\s_.\/-]+$/i.test(trimmed))) return "";
  return trimmed;
}

function comparable(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, "");
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function enumValue(values: Record<string, string>, token: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(values, token) ? values[token] : undefined;
}

function normalizeField(key: ScImportStringField, raw: unknown, warnings: string[]): string {
  const value = text(raw);
  if (!value) return "";
  const token = comparable(value);
  let normalized: string | undefined = value;
  if (key === "program") normalized = enumValue({ sp: "SP", supportsprogram: "SP", supportsprogramsp: "SP", ccp: "CCP", communitycareprogram: "CCP", communitycareprogramccp: "CCP" }, token);
  if (key === "gender") normalized = enumValue({ f: "female", female: "female", m: "male", male: "male", nonbinary: "non-binary", other: "other", prefernottosay: "prefer-not-to-say" }, token);
  if (key === "guardianRelationship") normalized = enumValue({ mother: "relative", father: "relative", mom: "relative", dad: "relative", parent: "relative", sibling: "relative", sister: "relative", brother: "relative", spouse: "relative", relative: "relative", familymember: "relative", guardian: "guardian", legalguardian: "guardian", advocate: "advocate", other: "other" }, token);
  if (key === "familyMemberRelationship") normalized = enumValue({ mother: "parent", father: "parent", mom: "parent", dad: "parent", parent: "parent", sister: "sibling", brother: "sibling", sibling: "sibling", spouse: "spouse", husband: "spouse", wife: "spouse", other: "other" }, token);
  if (key === "ssn") {
    const digits = value.replace(/[\s-]/g, "");
    normalized = /^\d{9}$/.test(digits) ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}` : undefined;
  }
  if (key === "dob" || dateFields.includes(key as typeof dateFields[number])) normalized = isIsoDate(value) && (key !== "dob" || value <= new Date().toISOString().slice(0, 10)) ? value : undefined;
  if (key === "state") normalized = token === "newjersey" ? "NJ" : /^[a-z]{2}$/i.test(value) ? value.toUpperCase() : undefined;
  if (key === "zip") normalized = /^\d{5}(?:-\d{4})?$/.test(value) ? value : undefined;
  if (key === "email" || key === "guardianEmail") normalized = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
  if (key === "phone" || key === "guardianPhone") normalized = /^\+?[\d\s().-]+(?:\s*(?:ext\.?|x)\s*\d+)?$/i.test(value) && value.replace(/\D/g, "").length >= 10 ? value : undefined;
  if (key === "medicaidId" || key === "dddId") normalized = /^[a-z0-9][a-z0-9 -]{0,63}$/i.test(value) ? value : undefined;
  if (!normalized) warnings.push(`${labels[key]} could not be imported. Review the document and enter a valid value manually.`);
  return normalized ?? "";
}

function previewValue(key: string, value: string): string {
  if (key !== "ssn" || !value) return value;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `•••-••-${digits.slice(-4)}` : "•••-••-••••";
}

/** Only approved enrollment fields are copied; attestations and saved service links stay owned by the form. */
export function mergeScExtractionDraft<T extends ScImportFormValues>(
  form: T,
  extraction: ScClientExtractionResponse,
  options?: { overwrite?: boolean },
): { form: T; rows: ScImportPreviewRow[]; warnings: string[]; blocked: boolean; changedFields: string[] } {
  const warnings = Array.isArray(extraction.warnings) ? extraction.warnings.map(warning => text(warning?.message)).filter(Boolean) : [];
  const draft = extraction.draft && typeof extraction.draft === "object" ? extraction.draft : {};
  const suggestions: Partial<Record<ScImportStringField, string>> = {};
  for (const key of Object.keys(labels) as Array<keyof typeof labels>) {
    if (key === "addressSearch") continue;
    const value = normalizeField(key, draft[key], warnings);
    if (value) suggestions[key] = value;
  }

  const matchingAnchor = identityFields.some(key => suggestions[key] && text(form[key]) && comparable(form[key]) === comparable(suggestions[key]!));
  let blocked = false;
  for (const key of [...identityFields, ...nameFields]) {
    const current = text(form[key]);
    const incoming = suggestions[key];
    if (!current || !incoming) continue;
    const left = comparable(current), right = comparable(incoming);
    const anchoredInitial = matchingAnchor && nameFields.includes(key as typeof nameFields[number]) && (left.length === 1 || right.length === 1) && left[0] === right[0];
    if (left !== right && !anchoredInitial) {
      blocked = true;
      warnings.push(`Participant identity mismatch: ${labels[key]} differs from the current participant. Confirm the correct participant and document before importing.`);
    }
  }

  const next = { ...form };
  const writable: ScImportFormValues = next;
  const rows: ScImportPreviewRow[] = [];
  const changedFields: string[] = [];
  const apply = (key: keyof typeof labels, value: string, allowed: boolean) => {
    const willApply = !blocked && allowed && form[key] !== value;
    rows.push({ key, label: labels[key], currentValue: previewValue(key, form[key]), extractedValue: previewValue(key, value), willApply });
    if (willApply) {
      writable[key] = value;
      changedFields.push(key);
    }
  };
  for (const [key, value] of Object.entries(suggestions) as Array<[ScImportStringField, string]>) {
    if (addressFields.includes(key as typeof addressFields[number]) || dateFields.includes(key as typeof dateFields[number])) continue;
    apply(key, value, !!options?.overwrite || !form[key].trim());
  }

  if (addressFields.some(key => suggestions[key])) {
    const completeIncoming = ["address", "city", "state", "zip"].every(key => suggestions[key as ScImportStringField]);
    const completeCurrent = ["address", "city", "state", "zip"].every(key => form[key as ScImportStringField].trim());
    const compatible = addressFields.every(key => !form[key].trim() || (suggestions[key] && comparable(form[key]) === comparable(suggestions[key]!)));
    const addressAllowed = completeIncoming && (!!options?.overwrite || (compatible && (!form.addressSearch.trim() || !!form.address.trim())));
    if (!completeIncoming) warnings.push("The extracted primary address is incomplete. Review and select the full address manually.");
    else if (!options?.overwrite && !completeCurrent && !addressAllowed) warnings.push("The extracted address differs from the partially entered address. Review the full address before replacing it.");
    for (const key of addressFields) {
      const value = suggestions[key] ?? "";
      if (value || (addressAllowed && options?.overwrite && form[key])) apply(key, value, addressAllowed && (!!options?.overwrite || !form[key].trim()));
    }
    if (completeIncoming) {
      const value = `${suggestions.address}, ${suggestions.city}, ${suggestions.state} ${suggestions.zip}`;
      apply("addressSearch", value, addressAllowed && (!!options?.overwrite || !form.addressSearch.trim()));
    }
  }

  if (dateFields.some(key => text(draft[key]))) {
    const start = suggestions.periodStartDate, end = suggestions.periodEndDate;
    const validPair = !!start && !!end && start <= end;
    const compatible = dateFields.every(key => !form[key].trim() || form[key] === suggestions[key]);
    const dateAllowed = validPair && (!!options?.overwrite || compatible);
    if (!validPair) warnings.push("Import ISP period dates together as a valid start and end date, with the end on or after the start.");
    else if (!dateAllowed && dateFields.some(key => !form[key].trim())) warnings.push("The extracted ISP period differs from the partially entered period. Review both dates before replacing them.");
    for (const key of dateFields) if (suggestions[key]) apply(key, suggestions[key]!, dateAllowed && (!!options?.overwrite || !form[key].trim()));
  }

  if (["guardianName", "guardianRelationship", "guardianPhone", "guardianEmail", "guardianAddress"].some(key => suggestions[key as ScImportStringField]) && !form.hasGuardian) warnings.push("Guardian details were found. Confirm whether a guardian / representative participates in the Guardian step.");
  if (["familyMemberName", "familyMemberRelationship"].some(key => suggestions[key as ScImportStringField]) && !form.familyMemberParticipates) warnings.push("Family member details were found. Confirm family participation in the Guardian step.");

  const statements = Array.isArray(draft.outcomes) ? [...new Map(draft.outcomes.map(value => {
    const statement = text(value);
    if (statement.length > 1000) {
      warnings.push("An extracted outcome exceeds 1000 characters. Review and enter a shorter statement manually.");
      return "";
    }
    return statement;
  }).filter(Boolean).map(value => [value.toLowerCase().replace(/\s+/g, " "), value])).values()] : [];
  if (statements.length) {
    const existing = new Set(form.outcomes.map(outcome => outcome.statement.trim().toLowerCase().replace(/\s+/g, " ")));
    const additions = statements.filter(statement => !existing.has(statement.toLowerCase().replace(/\s+/g, " ")));
    const willApply = !blocked && additions.length > 0;
    rows.push({ key: "outcomes", label: "Outcomes", currentValue: form.outcomes.map(outcome => outcome.statement).join("\n"), extractedValue: statements.join("\n"), willApply });
    if (willApply) {
      writable.outcomes = [...form.outcomes, ...additions.map(statement => ({ id: crypto.randomUUID(), statement, services: [] }))];
      changedFields.push("outcomes");
    }
  }
  return { form: blocked ? form : next, rows, warnings: [...new Set(warnings)], blocked, changedFields };
}
