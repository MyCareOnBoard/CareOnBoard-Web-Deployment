import type { AddClientFormData, DocState } from "../types/formData";
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
