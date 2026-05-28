import type { Service, ServiceSdrDetails, Outcome } from "../types/formData";
import { SDR_DETAILS_LIST_MAX, createEmptyServiceAuthorization } from "../types/formData";
import type { ExtractionServiceRow, ClientExtractionResponse } from "../types/clientExtraction";
import {
  capPersistAndDerive,
  sanitizeWeeklyPartsFromUnknown,
} from "./sdrWeeklyDistribution";
import { applySdrAuthorizationOverride } from "./normalizeExtractedServiceAuthorization";

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
export function extractionSdrToWizardDraft(
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

function parseIsoOrUsDate(raw: string | undefined): Date | undefined {
  const str = String(raw ?? "").trim();
  if (!str) return undefined;
  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

/** Apply SDR enrichment from an extraction service row onto a wizard service (fresh import). */
export function applySdrEnrichmentFromExtractionRow(
  base: Service,
  row: ExtractionServiceRow,
): Service {
  let next: Service = { ...base };

  if (!String(next.hours ?? "").trim() && String(row.hours ?? "").trim()) {
    next.hours = String(row.hours).trim();
  }

  const pa = sanitizePriorAuth(row.priorAuthorization);
  if (pa) {
    const parsedStart = parseIsoOrUsDate(pa.startDate);
    if (parsedStart) next.startAuthDate = parsedStart;
    const parsedEnd = parseIsoOrUsDate(pa.endDate);
    if (parsedEnd) next.endAuthDate = parsedEnd;
    const paMeta = priorAuthMetadataOnly(pa);
    if (paMeta) next.sdrPriorAuthorization = paMeta;
  }

  let weeklyDerivedTotalHours: string | undefined;
  const wdParts = sanitizeWeeklyPartsFromUnknown(row.weeklyDistribution);
  if (wdParts) {
    const { persisted, hours, totalHours } = capPersistAndDerive(wdParts);
    if (persisted) next.sdrWeeklyDistribution = persisted;
    if (!String(next.hours ?? "").trim() && hours) next.hours = hours;
    weeklyDerivedTotalHours = totalHours;
  }

  next = { ...next, ...applySdrAuthorizationOverride(row, { weeklyDerivedTotalHours }) };

  const sdrDraft = extractionSdrToWizardDraft(row.sdrDetails ?? {}, {
    providerLine: row.provider,
    claimsSourceLine: row.claimsSource,
  });
  if (sdrDraft) next.sdrDetails = sdrDraft;

  if (String(row.frequency ?? "").trim() && !String(next.frequency ?? "").trim()) {
    next.frequency = String(row.frequency).trim();
  }

  const procedureName = String(row.procedureName ?? "").trim();
  if (procedureName) next.procedureName = procedureName;

  return next;
}

function newOutcomeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `outcome-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Map one extraction service row to a wizard authorization row (bootstrap / fresh SDR import). */
export function mapExtractionRowToWizardService(row: ExtractionServiceRow): Service {
  let svc = createEmptyServiceAuthorization();
  const setStr = (key: keyof Service, val: unknown) => {
    if (val === undefined || val === null) return;
    const s = typeof val === "string" ? val.trim() : String(val).trim();
    if (!s) return;
    (svc as Record<string, unknown>)[key as string] = s;
  };
  setStr("code", row.code);
  setStr("name", row.name);
  setStr("claimsSource", row.claimsSource);
  const sStart = parseIsoOrUsDate(row.sdrStartDate);
  const sEnd = parseIsoOrUsDate(row.sdrEndDate);
  if (sStart) svc.sdrStartDate = sStart;
  if (sEnd) svc.sdrEndDate = sEnd;
  svc = applySdrEnrichmentFromExtractionRow(svc, row);
  return svc;
}

/** Build wizard outcome groups from an SDR extraction when Stage 2 has no anchor services. */
export function buildOutcomesFromSdrExtraction(
  extraction: ClientExtractionResponse | null | undefined,
): Outcome[] {
  const groups = extraction?.draft?.stage2?.outcomes ?? [];
  const out: Outcome[] = [];
  for (const g of groups) {
    if (!g || typeof g !== "object") continue;
    const statement = String(g.statement ?? "").trim();
    const rows = (g.services ?? []).filter((r) => r && typeof r === "object") as ExtractionServiceRow[];
    if (!rows.length) continue;
    const services = rows.map((row) => mapExtractionRowToWizardService(row));
    out.push({
      id: newOutcomeId(),
      statement,
      services,
    });
  }
  return out;
}
