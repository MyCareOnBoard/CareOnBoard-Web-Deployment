import type { ScClientExtractionDocument, ScClientExtractionDraft, ScImportStringField } from "../types/scClientExtraction";
import { mergeScExtractionDraft, type ScImportFormValues, type ScImportPreviewRow } from "./mergeScExtractionDraft";

const identityFields = ["firstName", "middleName", "lastName", "dddId", "medicaidId", "dob", "ssn"] as const;
const addressFields = ["address", "city", "county", "state", "zip"] as const;
const addressCore = ["address", "city", "state", "zip"] as const;
const dateFields = ["periodStartDate", "periodEndDate"] as const;

function comparable(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, "");
}

function outcomeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ScImportBatchPreview extends ScClientExtractionDocument {
  rows: ScImportPreviewRow[];
  warnings: string[];
}

export function mergeScExtractionBatch<T extends ScImportFormValues>(
  form: T,
  documents: ScClientExtractionDocument[],
  options?: { overwrite?: boolean },
): { form: T; previews: ScImportBatchPreview[]; warnings: string[]; blocked: boolean; changedFields: string[] } {
  if (!documents.length) return { form, previews: [], warnings: [], blocked: false, changedFields: [] };

  const empty: ScImportFormValues = { ...form, outcomes: [] };
  for (const key of Object.keys(empty) as Array<keyof ScImportFormValues>) {
    if (typeof empty[key] === "string") (empty as Record<string, unknown>)[key] = "";
  }
  const prepared = documents.map(document => {
    const review = mergeScExtractionDraft(form, document.extraction, options);
    const normalized = mergeScExtractionDraft(empty, document.extraction, { overwrite: true });
    const fileName = document.extraction.sourceDocument.fileName || document.fileKey;
    return { ...document, fileName, review, normalized, warnings: review.warnings.map(warning => `${fileName}: ${warning}`) };
  });

  let blocked = prepared.some(document => document.review.blocked);
  for (let left = 0; left < prepared.length; left += 1) {
    for (let right = left + 1; right < prepared.length; right += 1) {
      const draft: ScClientExtractionDraft = {};
      for (const key of identityFields) draft[key] = prepared[right].normalized.form[key];
      const identity = mergeScExtractionDraft(prepared[left].normalized.form, { ...prepared[right].extraction, draft, warnings: [] });
      if (!identity.blocked) continue;
      blocked = true;
      for (const warning of identity.warnings.filter(value => value.startsWith("Participant identity mismatch:"))) {
        const field = warning.match(/^Participant identity mismatch: (.*?) differs/)?.[1] ?? "Participant identity";
        const message = `Participant identity mismatch between "${prepared[left].fileName}" and "${prepared[right].fileName}": ${field} differs. Confirm the correct participant and documents before importing.`;
        prepared[left].warnings.push(message);
        prepared[right].warnings.push(message);
      }
    }
  }

  const draft: ScClientExtractionDraft = {};
  const owners = new Map<string, number>();
  const outcomeOwners = new Map<string, number>();
  const outcomes: string[] = [];
  const conflict = (key: ScImportStringField, index: number) => {
    const owner = owners.get(key)!;
    const label = prepared[index].review.rows.find(row => row.key === key)?.label ?? key;
    prepared[index].warnings.push(`"${prepared[index].fileName}": ${label} differs from "${prepared[owner].fileName}". The first document's value is retained for this batch.`);
  };
  const choose = (key: ScImportStringField, value: string, index: number) => {
    if (!value) return;
    if (!owners.has(key)) {
      draft[key] = value;
      owners.set(key, index);
    } else if (comparable(draft[key]!) !== comparable(value) && !identityFields.includes(key as typeof identityFields[number])) {
      conflict(key, index);
    }
  };

  for (const [index, document] of prepared.entries()) {
    const normalized = document.normalized.form;
    for (const key of document.normalized.changedFields) {
      if (key === "outcomes" || key === "addressSearch" || addressFields.includes(key as typeof addressFields[number]) || dateFields.includes(key as typeof dateFields[number])) continue;
      choose(key as ScImportStringField, normalized[key as ScImportStringField], index);
    }

    if (addressCore.every(key => normalized[key])) {
      const differentCore = addressCore.some(key => draft[key] && comparable(draft[key]!) !== comparable(normalized[key]));
      if (differentCore) {
        for (const key of addressFields) if (draft[key] && normalized[key] && comparable(draft[key]!) !== comparable(normalized[key])) conflict(key, index);
      } else {
        for (const key of addressFields) choose(key, normalized[key], index);
        if (!owners.has("addressSearch")) owners.set("addressSearch", index);
      }
    }
    if (dateFields.every(key => normalized[key])) {
      for (const key of dateFields) choose(key, normalized[key], index);
    }
    for (const outcome of normalized.outcomes) {
      const key = outcomeKey(outcome.statement);
      if (outcomeOwners.has(key)) continue;
      outcomeOwners.set(key, index);
      outcomes.push(outcome.statement);
    }
  }
  const addressOwner = owners.get("addressSearch");
  if (addressOwner !== undefined && !owners.has("county")) owners.set("county", addressOwner);
  draft.outcomes = outcomes;

  const merged = mergeScExtractionDraft(form, { ...documents[0].extraction, draft, warnings: [] }, options);
  blocked ||= merged.blocked;
  const changedFields = blocked ? [] : merged.changedFields;
  const existingOutcomes = new Set(form.outcomes.map(outcome => outcomeKey(outcome.statement)));
  const previews = prepared.map((document, index): ScImportBatchPreview => ({
    fileKey: document.fileKey,
    extraction: document.extraction,
    rows: document.review.rows.map(row => ({
      ...row,
      willApply: !blocked && changedFields.includes(row.key) && (row.key === "outcomes"
        ? document.normalized.form.outcomes.some(outcome => !existingOutcomes.has(outcomeKey(outcome.statement)) && outcomeOwners.get(outcomeKey(outcome.statement)) === index)
        : owners.get(row.key) === index),
    })),
    warnings: [...new Set(document.warnings)],
  }));
  return { form: blocked ? form : merged.form, previews, warnings: [...new Set(previews.flatMap(preview => preview.warnings))], blocked, changedFields };
}
