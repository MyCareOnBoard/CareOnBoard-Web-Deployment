import { format } from "date-fns";

import type { DocKey, AddClientFormData, Outcome, Service, ServiceSdrDetails } from "../types/formData";
import { SDR_DETAILS_LIST_MAX } from "../types/formData";
import type {
  ExtractionServiceRow,
  ClientExtractionResponse,
} from "../types/clientExtraction";
import { isDocKeyForImport } from "../types/clientExtraction";
import { trimWizardSdrDetailsForApi } from "./outcomeServices";
import {
  capPersistAndDerive,
  sanitizeWeeklyPartsFromUnknown,
  WEEKLY_DIST_DISPLAY_CAP,
} from "./sdrWeeklyDistribution";

function normalizeOutcomeKey(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNameToken(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Derive a one-line display summary from structured SDR fields (nothing stored redundantly). */
export function deriveSdrBreakdownSummary(d?: ServiceSdrDetails): string {
  if (!d) return "";
  const parts: string[] = [];
  if (d.setting?.trim()) parts.push(`Setting: ${d.setting.trim()}`);
  const freq = [d.frequency?.trim(), d.duration?.trim()].filter(Boolean).join(", ");
  if (freq) parts.push(freq);
  if (d.staffing?.trim()) parts.push(`Staffing: ${d.staffing.trim()}`);
  const dm = (d.deliveryMethods ?? []).filter(Boolean).slice(0, 3);
  if (dm.length) parts.push(dm.join("; "));
  const tasks = (d.supportTasks ?? []).filter(Boolean).slice(0, 3);
  if (tasks.length) parts.push(`Tasks: ${tasks.join("; ")}`);
  return parts.join(" · ").trim();
}

/** One-line summary of SDR enrichment that will be applied (for review UI). */
export function formatSdrPatchSummary(patch: Partial<Service>): string {
  const parts: string[] = [];
  if (patch.procedureName?.trim()) parts.push(`Procedure: ${patch.procedureName.trim()}`);
  if (patch.sdrComputedTotalHours?.trim()) parts.push(`SDR hrs: ${patch.sdrComputedTotalHours.trim()}`);
  if (patch.totalUnits?.trim()) parts.push(`Units: ${patch.totalUnits.trim()}`);
  if (patch.totalCost?.trim()) parts.push(`Cost: ${patch.totalCost.trim()}`);
  const src = patch.sdrDetails?.source;
  if (src?.claimsSource?.trim()) parts.push(`Payer: ${src.claimsSource.trim()}`);
  if (src?.provider?.trim()) parts.push(`SDR provider: ${src.provider.trim()}`);
  const metaBits: string[] = [];
  if (patch.startAuthDate && Number.isFinite(patch.startAuthDate.getTime())) {
    metaBits.push(format(patch.startAuthDate, "MM/dd/yyyy"));
  }
  if (patch.endAuthDate && Number.isFinite(patch.endAuthDate.getTime())) {
    metaBits.push(format(patch.endAuthDate, "MM/dd/yyyy"));
  }
  const paMeta = patch.sdrPriorAuthorization;
  const paNum = (paMeta?.paNumber ?? "").trim();
  const unitsTill = (paMeta?.approvedUnitsTillDate ?? "").trim();
  if (paNum) metaBits.push(paNum);
  if (unitsTill) metaBits.push(unitsTill);
  if (metaBits.length) parts.push(`PA: ${metaBits.join(" · ")}`);
  const wd = patch.sdrWeeklyDistribution;
  if (wd?.standardLine?.trim()) parts.push(`Weekly: ${wd.standardLine.trim()}`);
  const rowCount =
    wd?.rows?.filter((r) => (r.weekRange ?? "").trim() || (r.units ?? "").trim() || (r.hours ?? "").trim())
      .length ?? 0;
  if (rowCount) parts.push(`${rowCount} weekly row(s)`);
  const blur = deriveSdrBreakdownSummary(patch.sdrDetails);
  if (blur) parts.push(blur);
  return parts.join(" · ").trim();
}

/** True when any structured SDR authorization field is present on the service row (for Stage 2 UI). */
export function hasSdrAuthorizationDetails(service: Service): boolean {
  if ((service.sdrComputedTotalHours ?? "").trim()) return true;
  if ((service.totalUnits ?? "").trim()) return true;
  if ((service.totalCost ?? "").trim()) return true;
  if ((service.procedureName ?? "").trim()) return true;
  if ((service.unitType ?? "").trim()) return true;
  const pa = service.sdrPriorAuthorization;
  if (
    pa &&
    typeof pa === "object" &&
    Object.values(pa).some((v) => typeof v === "string" && !!(v as string).trim())
  ) {
    return true;
  }
  const wd = service.sdrWeeklyDistribution;
  if ((wd?.standardLine ?? "").trim()) return true;
  if ((wd?.rows?.length ?? 0) > 0) return true;
  return false;
}

export function substantiveWizardSdr(svc: Service): boolean {
  const d = svc.sdrDetails;
  if (!d) return false;
  return !!(
    (d.deliveryMethods?.length ?? 0) > 0 ||
    (d.supportTasks?.length ?? 0) > 0 ||
    !!(d.frequency?.trim() || d.duration?.trim() || d.setting?.trim() || d.staffing?.trim()) ||
    !!(
      d.source &&
      (d.source.outcomeStatement?.trim() ||
        d.source.serviceCode?.trim() ||
        d.source.serviceName?.trim() ||
        d.source.provider?.trim() ||
        d.source.claimsSource?.trim())
    )
  );
}

export function formatDiagnosisEntryLine(entry?: {
  diagnosisCode?: string;
  diagnosisDescription?: string;
}): string | undefined {
  const c = entry?.diagnosisCode?.trim() ?? "";
  const d = entry?.diagnosisDescription?.trim() ?? "";
  if (!c && !d) return undefined;
  if (c && d) return `${c} - ${d}`;
  return c || d;
}

function mergeSdrDiagnosisIntoStage3(
  stage3: AddClientFormData["stage3"],
  extraction: ClientExtractionResponse,
  overwrite: boolean,
): AddClientFormData["stage3"] {
  const p = formatDiagnosisEntryLine(extraction.draft.stage3?.primaryDiagnosisEntry);
  const sec = formatDiagnosisEntryLine(extraction.draft.stage3?.secondaryDiagnosisEntry);
  const next = { ...stage3 };
  const pExisting = String(next.primaryDiagnosis ?? "").trim();
  const sExisting = String(next.secondaryDiagnosis ?? "").trim();
  if (p && (overwrite || !pExisting)) next.primaryDiagnosis = p;
  if (sec && (overwrite || !sExisting)) next.secondaryDiagnosis = sec;
  return next;
}

function sanitizePriorAuth(raw: unknown): Service["sdrPriorAuthorization"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const keys = ["startDate", "endDate", "paNumber", "approvedUnitsTillDate"] as const;
  const next: Partial<Record<(typeof keys)[number], string>> = {};
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) next[k] = v.trim();
  }
  return Object.keys(next).length ? (next as Service["sdrPriorAuthorization"]) : undefined;
}

/** PA blob on wizard stores only extractor metadata; canonical auth dates live on startAuthDate/endAuthDate. */
function priorAuthMetadataOnly(
  pa: Service["sdrPriorAuthorization"] | undefined,
): Service["sdrPriorAuthorization"] | undefined {
  if (!pa || typeof pa !== "object") return undefined;
  const out: Service["sdrPriorAuthorization"] = {};
  const n = typeof pa.paNumber === "string" ? pa.paNumber.trim() : "";
  const u = typeof pa.approvedUnitsTillDate === "string" ? pa.approvedUnitsTillDate.trim() : "";
  if (n) out.paNumber = n;
  if (u) out.approvedUnitsTillDate = u;
  return Object.keys(out).length ? out : undefined;
}

function buildSdrEnrichmentPatch(row: ExtractionServiceRow, wizardSvc: Service, overwrite: boolean): Partial<Service> {
  const patch: Partial<Service> = {};

  function wizardHasSparsePrior(pa: Service["sdrPriorAuthorization"] | undefined): boolean {
    if (!pa || typeof pa !== "object") return false;
    return Object.values(pa).some((v) => typeof v === "string" && !!(v as string).trim());
  }

  function wizardHasWeekly(w?: Service["sdrWeeklyDistribution"]): boolean {
    if (!w || typeof w !== "object") return false;
    if ((w.standardLine ?? "").trim()) return true;
    return (w.rows?.length ?? 0) > 0;
  }

  function mergeScalar<K extends keyof Service>(key: K, incomingRaw: unknown) {
    if (incomingRaw === undefined || incomingRaw === null) return;
    const incoming =
      typeof incomingRaw === "string" ? incomingRaw.trim() : String(incomingRaw).trim();
    if (!incoming) return;
    const cur = wizardSvc[key];
    const curEmpty =
      cur === undefined ||
      cur === null ||
      (typeof cur === "string" && !(cur as string).trim());
    if (overwrite || curEmpty) (patch as Record<string, unknown>)[key as string] = incoming;
  }

  mergeScalar("procedureName", row.procedureName);
  mergeScalar("sdrComputedTotalHours", row.sdrComputedTotalHours);
  mergeScalar("totalUnits", row.totalUnits);
  mergeScalar("totalCost", row.totalCost);
  mergeScalar("unitType", row.unitType);
  /** Top-level extractor `hours` may fill empty wizard scalar; superseded later when WD derivation yields hours. */
  mergeScalar("hours", row.hours);

  function wizardAuthDateMissing(d?: Date): boolean {
    return !d || !Number.isFinite(d.getTime());
  }

  const pa = sanitizePriorAuth(row.priorAuthorization);
  if (pa) {
    const parsedStart = parseIsoOrUsDate(pa.startDate);
    if (parsedStart && (overwrite || wizardAuthDateMissing(wizardSvc.startAuthDate))) {
      patch.startAuthDate = parsedStart;
    }
    const parsedEnd = parseIsoOrUsDate(pa.endDate);
    if (parsedEnd && (overwrite || wizardAuthDateMissing(wizardSvc.endAuthDate))) {
      patch.endAuthDate = parsedEnd;
    }

    const paMeta = priorAuthMetadataOnly(pa);
    if (paMeta && (overwrite || !wizardHasSparsePrior(wizardSvc.sdrPriorAuthorization))) {
      patch.sdrPriorAuthorization = paMeta;
    }
  }

  const wdParts = sanitizeWeeklyPartsFromUnknown(row.weeklyDistribution);
  if (wdParts) {
    const { persisted, hours, totalApprovedHours } = capPersistAndDerive(wdParts);
    if (persisted && (overwrite || !wizardHasWeekly(wizardSvc.sdrWeeklyDistribution))) {
      patch.sdrWeeklyDistribution = persisted;
      const wizardHoursEmpty = !String(wizardSvc.hours ?? "").trim();
      if (overwrite || wizardHoursEmpty) {
        patch.hours = hours;
      }
      const wizardTotalEmpty = !String(wizardSvc.totalApprovedHours ?? "").trim();
      if (overwrite || wizardTotalEmpty) {
        patch.totalApprovedHours = totalApprovedHours;
      }
    }
  }

  return patch;
}

export function parseIsoOrUsDate(raw: string | undefined): Date | undefined {
  const str = String(raw).trim();
  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

function dedupeCapStrings(items: unknown[] | undefined): string[] {
  if (!Array.isArray(items) || !items.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    const t = String(x ?? "").trim();
    if (!t || seen.has(t) || out.length >= SDR_DETAILS_LIST_MAX) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Build wizard `ServiceSdrDetails` from extracted row (excluding importedAt until apply time). */
function extractionSdrToWizardDraft(
  d: NonNullable<ExtractionServiceRow["sdrDetails"]>,
  augment?: { providerLine?: string; claimsSourceLine?: string },
): ServiceSdrDetails | undefined {
  const dm = dedupeCapStrings(d.deliveryMethods);
  const st = dedupeCapStrings(d.supportTasks);
  const src = d.source;
  const providerLine =
    augment?.providerLine?.trim() || (typeof src?.provider === "string" ? src.provider.trim() : "") || "";
  const claimsLine =
    augment?.claimsSourceLine?.trim() ||
    (typeof src?.claimsSource === "string" ? src.claimsSource.trim() : "") ||
    "";

  const hasSourceBits = !!(
    src?.outcomeStatement?.trim() ||
    src?.serviceName?.trim() ||
    src?.serviceCode?.trim() ||
    providerLine ||
    claimsLine
  );

  const source = hasSourceBits
    ? {
        outcomeStatement: src?.outcomeStatement?.trim() || undefined,
        serviceName: src?.serviceName?.trim() || undefined,
        serviceCode: src?.serviceCode?.trim() || undefined,
        ...(providerLine ? { provider: providerLine } : {}),
        ...(claimsLine ? { claimsSource: claimsLine } : {}),
      }
    : undefined;

  const out: ServiceSdrDetails = {
    deliveryMethods: dm.length ? dm : undefined,
    supportTasks: st.length ? st : undefined,
    frequency: d.frequency?.trim() || undefined,
    duration: d.duration?.trim() || undefined,
    setting: d.setting?.trim() || undefined,
    staffing: d.staffing?.trim() || undefined,
    source,
  };

  const empty =
    !out.deliveryMethods?.length &&
    !out.supportTasks?.length &&
    !out.frequency &&
    !out.duration &&
    !out.setting &&
    !out.staffing &&
    !source;
  return empty ? undefined : out;
}

type WizardSvcRef = {
  outcomeIdx: number;
  outcomeId: string;
  serviceId: string;
  outcomeKey: string;
  codeNorm: string;
  nameNorm: string;
  service: Service;
};

export type SdrMatchedPreviewLine = {
  extractOutcomeSnippet: string;
  extractCode: string;
  extractName: string;
  wizardOutcomeIndex: number;
  wizardOutcomeId: string;
  wizardServiceId: string;
  wizardOutcomeLabel: string;
  wizardServiceCode: string;
  wizardServiceName: string;
  matchReason:
    | "ai_matched_service"
    | "code_same_outcome"
    | "code_unique_global"
    | "name_same_outcome"
    | "name_unique_global";
  patchDraft: Partial<Service>;
};

export type SdrNeedsReviewPreviewLine = {
  extractOutcomeSnippet: string;
  extractCode: string;
  extractName: string;
  extractProvider?: string;
  reason: string;
};

export type SdrSkippedPreviewLine = {
  extractOutcomeSnippet: string;
  extractCode: string;
  extractName: string;
  reason?: string;
};

export type SdrImportPreviewRow = {
  matched: SdrMatchedPreviewLine[];
  needsReview: SdrNeedsReviewPreviewLine[];
  skipped: SdrSkippedPreviewLine[];
  keptExisting: SdrMatchedPreviewLine[];
  warnings: string[];
};

export function attachSdrFileToWizardDocs(
  docs: AddClientFormData["stage3"]["docs"],
  file: File | null | undefined,
): AddClientFormData["stage3"]["docs"] {
  if (!file) return docs;
  const slotKey = "sdr" as DocKey;
  if (!isDocKeyForImport(slotKey)) return docs;
  return docs.map((d) => (d.key === slotKey ? { ...d, file, fileName: file.name } : d));
}

function flattenExtractionOutcomeServices(extraction: ClientExtractionResponse | null | undefined): Array<{
  parentOutcomeStmt: string;
  parentOutcomeKey: string;
  row: ExtractionServiceRow;
}> {
  if (!extraction?.draft?.stage2?.outcomes?.length) return [];
  const out: Array<{
    parentOutcomeStmt: string;
    parentOutcomeKey: string;
    row: ExtractionServiceRow;
  }> = [];
  for (const o of extraction.draft.stage2.outcomes ?? []) {
    const stmt = (o?.statement ?? "").trim();
    const stmtKey = normalizeOutcomeKey(stmt);
    for (const row of o?.services ?? []) {
      if (!row || typeof row !== "object") continue;
      out.push({
        parentOutcomeStmt: stmt,
        parentOutcomeKey: stmtKey,
        row,
      });
    }
  }
  return out;
}

function indexWizard(outcomes: Outcome[]): WizardSvcRef[] {
  const refs: WizardSvcRef[] = [];
  outcomes.forEach((o, oi) => {
    (o.services ?? []).forEach((s) => {
      refs.push({
        outcomeIdx: oi,
        outcomeId: o.id,
        serviceId: s.id,
        outcomeKey: normalizeOutcomeKey(o.statement),
        codeNorm: (s.code ?? "").trim().toLowerCase(),
        nameNorm: normalizeNameToken(s.name),
        service: s,
      });
    });
  });
  return refs;
}

const WIZ_OUTCOME_CODE_SEP = "\u001f";

type WizardIndexes = {
  refs: WizardSvcRef[];
  byOutcomeCode: Map<string, WizardSvcRef[]>;
  byOutcomeName: Map<string, WizardSvcRef[]>;
  byGlobalCode: Map<string, WizardSvcRef[]>;
  byGlobalName: Map<string, WizardSvcRef[]>;
};

function pushWizardRef(map: Map<string, WizardSvcRef[]>, key: string, w: WizardSvcRef) {
  const arr = map.get(key);
  if (arr) arr.push(w);
  else map.set(key, [w]);
}

function buildWizardIndexes(outcomes: Outcome[]): WizardIndexes {
  const refs = indexWizard(outcomes);
  const byOutcomeCode = new Map<string, WizardSvcRef[]>();
  const byOutcomeName = new Map<string, WizardSvcRef[]>();
  const byGlobalCode = new Map<string, WizardSvcRef[]>();
  const byGlobalName = new Map<string, WizardSvcRef[]>();

  for (const w of refs) {
    if (w.codeNorm) {
      pushWizardRef(byOutcomeCode, `${w.outcomeKey}${WIZ_OUTCOME_CODE_SEP}${w.codeNorm}`, w);
      pushWizardRef(byGlobalCode, w.codeNorm, w);
    }
    if (w.nameNorm) {
      pushWizardRef(byOutcomeName, `${w.outcomeKey}${WIZ_OUTCOME_CODE_SEP}${w.nameNorm}`, w);
      pushWizardRef(byGlobalName, w.nameNorm, w);
    }
  }

  return { refs, byOutcomeCode, byOutcomeName, byGlobalCode, byGlobalName };
}

export function buildSdrImportPreview(
  extraction: ClientExtractionResponse | null | undefined,
  outcomes: Outcome[],
  options?: { overwrite?: boolean },
): SdrImportPreviewRow {
  const overwrite = options?.overwrite !== false;
  const warnings: string[] = [];
  const matched: SdrMatchedPreviewLine[] = [];
  const needsReview: SdrNeedsReviewPreviewLine[] = [];
  const skipped: SdrSkippedPreviewLine[] = [];
  const keptExisting: SdrMatchedPreviewLine[] = [];

  const wizIdx = buildWizardIndexes(outcomes);
  const { refs: wiz, byOutcomeCode, byOutcomeName, byGlobalCode, byGlobalName } = wizIdx;
  const flatEx = flattenExtractionOutcomeServices(extraction);
  const seenWizardTargets = new Set<string>();
  let weeklyTruncationWarned = false;

  for (const ex of flatEx) {
    const { row, parentOutcomeKey, parentOutcomeStmt } = ex;

    if (
      !weeklyTruncationWarned &&
      row.weeklyDistribution &&
      typeof row.weeklyDistribution === "object"
    ) {
      const wdRaw = row.weeklyDistribution as Record<string, unknown>;
      const rowsRaw = Array.isArray(wdRaw.rows) ? wdRaw.rows : [];
      if (rowsRaw.length > WEEKLY_DIST_DISPLAY_CAP) {
        warnings.push(
          `Weekly distribution exceeds ${WEEKLY_DIST_DISPLAY_CAP} rows; only the first ${WEEKLY_DIST_DISPLAY_CAP} will be stored.`,
        );
        weeklyTruncationWarned = true;
      }
    }

    const codeNorm = (row.code ?? "").trim().toLowerCase();
    const nameNorm = normalizeNameToken(row.name);
    const extProv = row.provider?.trim();
    const sdrDraft = extractionSdrToWizardDraft(row.sdrDetails ?? {}, {
      providerLine: extProv,
      claimsSourceLine: row.claimsSource?.trim(),
    });
    const provDatePatch: Partial<Service> = {};
    const sStart = parseIsoOrUsDate(row.sdrStartDate);
    const sEnd = parseIsoOrUsDate(row.sdrEndDate);
    if (sStart) provDatePatch.sdrStartDate = sStart;
    if (sEnd) provDatePatch.sdrEndDate = sEnd;

    const rowHasStructured =
      !!(row.procedureName ?? "").trim() ||
      !!(row.sdrComputedTotalHours ?? "").trim() ||
      !!(row.claimsSource ?? "").trim() ||
      !!(row.totalUnits ?? "").trim() ||
      !!(row.totalCost ?? "").trim() ||
      !!(row.unitType ?? "").trim() ||
      (!!row.priorAuthorization && typeof row.priorAuthorization === "object") ||
      (!!row.weeklyDistribution && typeof row.weeklyDistribution === "object");

    const hasAnyPayload =
      !!sdrDraft ||
      Object.keys(provDatePatch).length > 0 ||
      !!(row.frequency ?? "").trim() ||
      rowHasStructured ||
      false;

    if (!codeNorm && !nameNorm && !hasAnyPayload) continue;

    const sameOutcomeCodeMatches =
      parentOutcomeKey && codeNorm
        ? (byOutcomeCode.get(`${parentOutcomeKey}${WIZ_OUTCOME_CODE_SEP}${codeNorm}`) ?? [])
        : [];
    const sameOutcomeNameMatches =
      parentOutcomeKey && nameNorm
        ? (byOutcomeName.get(`${parentOutcomeKey}${WIZ_OUTCOME_CODE_SEP}${nameNorm}`) ?? [])
        : [];

    const globalCodeMatches = codeNorm ? (byGlobalCode.get(codeNorm) ?? []) : [];
    const globalNameMatches = nameNorm ? (byGlobalName.get(nameNorm) ?? []) : [];

    let chosen: WizardSvcRef | undefined;
    let reason: SdrMatchedPreviewLine["matchReason"] | undefined;
    let outcomeMismatchWarn = false;

    const aiOi = typeof row.matchedOutcomeId === "string" ? row.matchedOutcomeId.trim() : "";
    const aiSi = typeof row.matchedServiceId === "string" ? row.matchedServiceId.trim() : "";
    if (aiOi && aiSi) {
      const aiRef = wiz.find((w) => w.outcomeId === aiOi && w.serviceId === aiSi);
      if (aiRef) {
        const hasExtCode = !!codeNorm;
        const hasWizCode = !!aiRef.codeNorm;
        const hasExtName = !!nameNorm;
        const hasWizName = !!aiRef.nameNorm;
        const codeConflict = hasExtCode && hasWizCode && codeNorm !== aiRef.codeNorm;
        const nameConflict = hasExtName && hasWizName && nameNorm !== aiRef.nameNorm;
        const nameAgreement = hasExtName && hasWizName && nameNorm === aiRef.nameNorm;
        const codeAgreement = hasExtCode && hasWizCode && codeNorm === aiRef.codeNorm;

        if (codeConflict && !(hasExtName && nameAgreement)) {
          needsReview.push({
            extractOutcomeSnippet: parentOutcomeStmt || "(no outcome text)",
            extractCode: row.code ?? "",
            extractName: row.name ?? "",
            extractProvider: extProv,
            reason:
              "AI-selected service disagrees with the extracted service code. Choose the correct row manually.",
          });
          continue;
        }
        if (nameConflict && !(hasExtCode && codeAgreement)) {
          needsReview.push({
            extractOutcomeSnippet: parentOutcomeStmt || "(no outcome text)",
            extractCode: row.code ?? "",
            extractName: row.name ?? "",
            extractProvider: extProv,
            reason:
              "AI-selected service disagrees with the extracted service name. Choose the correct row manually.",
          });
          continue;
        }
        chosen = aiRef;
        reason = "ai_matched_service";
        if (
          parentOutcomeKey &&
          chosen.outcomeKey !== parentOutcomeKey &&
          normalizeOutcomeKey((row.sdrDetails?.source?.outcomeStatement ?? "").trim()) !==
            chosen.outcomeKey
        ) {
          warnings.push(
            `AI-matched service (${chosen.service.code ?? chosen.serviceId}) may not match this SDR grouping; review before saving.`,
          );
        }
      }
    }

    if (!chosen) {
      if (codeNorm && sameOutcomeCodeMatches.length === 1) {
        chosen = sameOutcomeCodeMatches[0];
        reason = "code_same_outcome";
      } else if (codeNorm && sameOutcomeCodeMatches.length > 1) {
        needsReview.push({
          extractOutcomeSnippet: parentOutcomeStmt || "(no outcome text)",
          extractCode: row.code ?? "",
          extractName: row.name ?? "",
          extractProvider: extProv,
          reason: `More than one service uses code ${codeNorm} within the same ISP outcome.`,
        });
        warnings.push(`More than one service uses code ${row.code ?? codeNorm}. Choose the right service manually.`);
        continue;
      } else if (codeNorm && globalCodeMatches.length === 1) {
        chosen = globalCodeMatches[0];
        reason = "code_unique_global";
        if (
          chosen &&
          parentOutcomeKey &&
          chosen.outcomeKey !== parentOutcomeKey &&
          normalizeOutcomeKey((row.sdrDetails?.source?.outcomeStatement ?? "").trim()) !== chosen.outcomeKey
        ) {
          outcomeMismatchWarn = true;
        }
      } else if (codeNorm && globalCodeMatches.length > 1) {
        needsReview.push({
          extractOutcomeSnippet: parentOutcomeStmt || "(no outcome text)",
          extractCode: row.code ?? "",
          extractName: row.name ?? "",
          extractProvider: extProv,
          reason: `Multiple existing services match code ${codeNorm}.`,
        });
        warnings.push(`More than one service uses code ${codeNorm}. Choose the right service manually.`);
        continue;
      } else if (nameNorm && sameOutcomeNameMatches.length === 1) {
        chosen = sameOutcomeNameMatches[0];
        reason = "name_same_outcome";
      } else if (nameNorm && globalNameMatches.length === 1) {
        chosen = globalNameMatches[0];
        reason = "name_unique_global";
        if (chosen && parentOutcomeKey && chosen.outcomeKey !== parentOutcomeKey) {
          outcomeMismatchWarn = true;
        }
      }

      if (!chosen && (extProv || !!(row.frequency ?? "").trim()) && globalCodeMatches.length > 1) {
        const pLow = extProv?.toLowerCase() ?? "";
        const narrowed = globalCodeMatches.filter(
          (w) =>
            (!pLow || (w.service.provider ?? "").trim().toLowerCase().includes(pLow)) ||
            (!!(row.frequency ?? "").trim() &&
              (w.service.frequency ?? "").trim().toLowerCase() === (row.frequency ?? "").trim().toLowerCase()),
        );
        if (narrowed.length === 1) {
          chosen = narrowed[0];
          reason = "code_unique_global";
        }
      }
    }

    if (!chosen) {
      if (codeNorm || nameNorm || hasAnyPayload) {
        skipped.push({
          extractOutcomeSnippet: parentOutcomeStmt || "(no outcome)",
          extractCode: row.code ?? "",
          extractName: row.name ?? "",
          reason: "No matching service row in Stage 2 (code/name).",
        });
      }
      continue;
    }

    if (outcomeMismatchWarn && reason === "code_unique_global") {
      warnings.push(
        `Matched by service code, but the outcome text was different. Review matching service (${row.code ?? nameNorm}).`,
      );
    }

    const enrichPatch = buildSdrEnrichmentPatch(row, chosen.service, overwrite);

    const patchDraft: Partial<Service> = { ...provDatePatch };
    Object.assign(patchDraft, enrichPatch);
    if (sdrDraft)
      patchDraft.sdrDetails = {
        ...sdrDraft,
        importedAt: undefined,
      };

    if ((row.frequency ?? "").trim() && !chosen.service.frequency?.trim()) {
      patchDraft.frequency = row.frequency!.trim();
    }

    const line: SdrMatchedPreviewLine = {
      extractOutcomeSnippet: parentOutcomeStmt || "(none)",
      extractCode: row.code ?? "",
      extractName: row.name ?? "",
      wizardOutcomeIndex: chosen.outcomeIdx,
      wizardOutcomeId: outcomes[chosen.outcomeIdx]?.id ?? "",
      wizardServiceId: chosen.serviceId,
      wizardOutcomeLabel: outcomes[chosen.outcomeIdx]?.statement?.trim() ?? `Outcome ${chosen.outcomeIdx + 1}`,
      wizardServiceCode: chosen.service.code ?? "",
      wizardServiceName: chosen.service.name ?? "",
      matchReason: reason ?? "code_unique_global",
      patchDraft,
    };

    const tgtKey = `${chosen.outcomeIdx}\u001f${chosen.serviceId}`;
    if (seenWizardTargets.has(tgtKey)) {
      needsReview.push({
        extractOutcomeSnippet: parentOutcomeStmt || "(no outcome text)",
        extractCode: row.code ?? "",
        extractName: row.name ?? "",
        extractProvider: extProv,
        reason: "Multiple SDR periods for this service — merge manually.",
      });
      continue;
    }
    seenWizardTargets.add(tgtKey);

    if (!overwrite && substantiveWizardSdr(chosen.service)) {
      keptExisting.push(line);
    } else {
      matched.push(line);
    }
  }

  if (skipped.length + needsReview.length > 0) {
    warnings.push(
      `${skipped.length + needsReview.length} SDR row(s) could not be matched and were skipped.`,
    );
  }

  return { matched, needsReview, skipped, keptExisting, warnings };
}

/**
 * Applies matched SDR previews to cloned outcomes.
 * When overwrite is false and the target service already has substantive SDR breakdown,
 * `sdrDetails` / frequency / claimsSource / unitType from the document are skipped; authorization
 * scalars (units, cost, PA, weekly rows, procedure, SDR hours) still merge when present on the patch.
 */
export function applySdrImportToWizard(
  formData: AddClientFormData,
  preview: Pick<SdrImportPreviewRow, "matched"> &
    Partial<Pick<SdrImportPreviewRow, "warnings" | "keptExisting">>,
  options: {
    overwrite: boolean;
    file?: File | null;
    extraction?: ClientExtractionResponse | null;
  },
): { formData: AddClientFormData; appliedCount: number; keptExistingCount: number; localWarnings: string[] } {
  const localWarnings = [...(preview.warnings ?? [])];
  let appliedCount = 0;
  const keptExistingCount = preview.keptExisting?.length ?? 0;

  const diagStage3 = options.extraction
    ? mergeSdrDiagnosisIntoStage3(formData.stage3, options.extraction, options.overwrite)
    : formData.stage3;

  const outcomes = formData.stage2.outcomes.map((o) => ({
    ...o,
    services: o.services.map((s) => ({ ...s })),
  }));

  const findService = (outcomeIdx: number, serviceId: string): Service | undefined =>
    outcomes[outcomeIdx]?.services.find((s) => s.id === serviceId);

  function stripSkippedSdrBlobFromPatch(patch: Partial<Service>, skipBlob: boolean) {
    if (!skipBlob) return;
    delete patch.sdrDetails;
    delete patch.frequency;
    delete patch.claimsSource;
    delete patch.unitType;
  }

  function assignPatchToService(svc: Service, patchSrc: Partial<Service>, skipBlob: boolean) {
    const patch = { ...patchSrc };
    stripSkippedSdrBlobFromPatch(patch, skipBlob);

    const keysLeft = Object.keys(patch).filter((k) => patch[k as keyof Service] !== undefined);
    if (!keysLeft.length) return false;

    const importedIso = new Date().toISOString();
    const nextPartial: Partial<Service> = { ...patch };
    if (patch.sdrDetails) {
      const td = trimWizardSdrDetailsForApi({
        ...patch.sdrDetails,
        importedAt: importedIso,
      });
      if (td) nextPartial.sdrDetails = td;
      else delete nextPartial.sdrDetails;
    }

    Object.assign(svc, nextPartial);
    return true;
  }

  for (const m of preview.matched) {
    const svc = findService(m.wizardOutcomeIndex, m.wizardServiceId);
    if (!svc) continue;

    const skipBlob = !options.overwrite && substantiveWizardSdr(svc);
    if (assignPatchToService(svc, m.patchDraft, skipBlob)) appliedCount += 1;
  }

  for (const m of preview.keptExisting ?? []) {
    const svc = findService(m.wizardOutcomeIndex, m.wizardServiceId);
    if (!svc) continue;
    const patch = { ...m.patchDraft };
    delete patch.sdrDetails;
    delete patch.frequency;
    delete patch.claimsSource;
    delete patch.unitType;
    if (assignPatchToService(svc, patch, false)) appliedCount += 1;
  }

  let stage3Docs = formData.stage3.docs;
  if (options.file) {
    stage3Docs = attachSdrFileToWizardDocs(stage3Docs, options.file);
  }

  const nextForm: AddClientFormData = {
    ...formData,
    stage2: { ...formData.stage2, outcomes },
    stage3: { ...diagStage3, docs: stage3Docs },
  };

  return { formData: nextForm, appliedCount, keptExistingCount, localWarnings };
}
