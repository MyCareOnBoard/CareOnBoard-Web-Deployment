import type { AddClientFormData, DocKey, DocState } from "../types/formData";
import { buildPocFormContext } from "./buildPocFormContext";
import { stableJsonStringify } from "./stableJsonStringify";

export function getDocByKey(
  docs: DocState[],
  key: DocKey,
): DocState | undefined {
  return docs.find((d) => d.key === key);
}

/** True when the slot has a local file, files array, or persisted URL. */
export function hasDocSource(doc: DocState | undefined): boolean {
  if (!doc) return false;
  if (doc.file) return true;
  if (doc.files && doc.files.length > 0) return true;
  return Boolean(doc.url?.trim());
}

export function hasPocDocument(formData: AddClientFormData): boolean {
  const poc = getDocByKey(formData.stage3.docs, "poc");
  return hasDocSource(poc);
}

export function hasIspOrPcptSource(formData: AddClientFormData): boolean {
  const isp = getDocByKey(formData.stage3.docs, "isp");
  const pcpt = getDocByKey(formData.stage3.docs, "pcpt");
  return hasDocSource(isp) || hasDocSource(pcpt);
}

/** Save/Submit guard: POC missing but ISP and/or PCPT present. */
export function shouldShowPocSaveGuard(formData: AddClientFormData): boolean {
  return !hasPocDocument(formData) && hasIspOrPcptSource(formData);
}

/** Stage 3 Generate CTA and Generate action in guard (requires AI builder flag). */
export function canGeneratePoc(formData: AddClientFormData): boolean {
  return shouldShowPocSaveGuard(formData) && formData.stage7.aiPlanOfCareBuilder;
}

export type PocSourceSummary = "isp-and-pcpt" | "isp-only" | "pcpt-only";

export function getPocSourceSummary(formData: AddClientFormData): PocSourceSummary | null {
  const isp = getDocByKey(formData.stage3.docs, "isp");
  const pcpt = getDocByKey(formData.stage3.docs, "pcpt");
  const hasIsp = hasDocSource(isp);
  const hasPcpt = hasDocSource(pcpt);
  if (hasIsp && hasPcpt) return "isp-and-pcpt";
  if (hasIsp) return "isp-only";
  if (hasPcpt) return "pcpt-only";
  return null;
}

export function pocSourceSummaryLabel(summary: PocSourceSummary | null): string {
  switch (summary) {
    case "isp-and-pcpt":
      return "Using: ISP and PCPT";
    case "isp-only":
      return "Using: ISP only";
    case "pcpt-only":
      return "Using: PCPT only";
    default:
      return "";
  }
}

/** Stable cache key for generation results (avoid duplicate Gemini calls). */
export function buildPocGenerationInputSignature(
  formData: AddClientFormData,
  clientId?: string,
): string {
  const isp = getDocByKey(formData.stage3.docs, "isp");
  const pcpt = getDocByKey(formData.stage3.docs, "pcpt");
  const ispPart = isp?.file
    ? `file:${isp.file.name}:${isp.file.size}`
    : isp?.url
      ? `url:${isp.url}`
      : "";
  const pcptPart = pcpt?.file
    ? `file:${pcpt.file.name}:${pcpt.file.size}`
    : pcpt?.url
      ? `url:${pcpt.url}`
      : "";
  const ctx = stableJsonStringify(buildPocFormContext(formData));
  return [clientId ?? "", ispPart, pcptPart, ctx].join("|");
}
