import type { ClientDsp, ClientOutcome, ClientService } from "@/lib/api/clients";
import {
  createEmptyServiceAuthorization,
  SDR_DETAILS_LIST_MAX,
  type Outcome,
  type Service,
  type ServiceSdrDetails,
} from "../types/formData";

export const UNASSIGNED_OUTCOME_LABEL = "Unassigned outcome";

const toIso = (d?: Date) => (d ? d.toISOString() : undefined);

/** Trim, dedupe, and cap SDR string lists for API / wizard. */
function dedupeTrimStringList(
  raw: string[] | undefined,
  maxLen: number = SDR_DETAILS_LIST_MAX,
): string[] | undefined {
  if (!raw?.length) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const t = String(item).trim();
    if (!t || seen.has(t) || out.length >= maxLen) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length ? out : undefined;
}

export function trimWizardSdrDetailsForApi(d: ServiceSdrDetails): NonNullable<ClientService["sdrDetails"]> | undefined {
  const src = d.source;
  const source =
    src &&
    (src.outcomeStatement?.trim() ||
      src.serviceName?.trim() ||
      src.serviceCode?.trim() ||
      src.provider?.trim() ||
      src.claimsSource?.trim())
      ? {
          outcomeStatement: src.outcomeStatement?.trim() || undefined,
          serviceName: src.serviceName?.trim() || undefined,
          serviceCode: src.serviceCode?.trim() || undefined,
          ...(src.provider?.trim() ? { provider: src.provider.trim() } : {}),
          ...(src.claimsSource?.trim() ? { claimsSource: src.claimsSource.trim() } : {}),
        }
      : undefined;

  const next: NonNullable<ClientService["sdrDetails"]> = {
    deliveryMethods: dedupeTrimStringList(d.deliveryMethods),
    supportTasks: dedupeTrimStringList(d.supportTasks),
    frequency: d.frequency?.trim() || undefined,
    duration: d.duration?.trim() || undefined,
    setting: d.setting?.trim() || undefined,
    staffing: d.staffing?.trim() || undefined,
    source,
    importedAt: d.importedAt?.trim() || undefined,
  };
  const empty =
    !next.deliveryMethods?.length &&
    !next.supportTasks?.length &&
    !next.frequency &&
    !next.duration &&
    !next.setting &&
    !next.staffing &&
    !source &&
    !next.importedAt;
  return empty ? undefined : next;
}

/** Map API-returned nested SDR into wizard shape. */
export function clientSdrDetailsToWizard(
  d: ClientService["sdrDetails"] | undefined,
): ServiceSdrDetails | undefined {
  if (!d) return undefined;
  const src = d.source;
  const source =
    src &&
    (src.outcomeStatement?.trim() ||
      src.serviceName?.trim() ||
      src.serviceCode?.trim() ||
      src.provider?.trim() ||
      src.claimsSource?.trim())
      ? {
          outcomeStatement: src.outcomeStatement?.trim() || undefined,
          serviceName: src.serviceName?.trim() || undefined,
          serviceCode: src.serviceCode?.trim() || undefined,
          ...(src.provider?.trim() ? { provider: src.provider.trim() } : {}),
          ...(src.claimsSource?.trim() ? { claimsSource: src.claimsSource.trim() } : {}),
        }
      : undefined;
  const out: ServiceSdrDetails = {
    deliveryMethods: dedupeTrimStringList(d.deliveryMethods),
    supportTasks: dedupeTrimStringList(d.supportTasks),
    frequency: d.frequency?.trim() || undefined,
    duration: d.duration?.trim() || undefined,
    setting: d.setting?.trim() || undefined,
    staffing: d.staffing?.trim() || undefined,
    source,
    importedAt: d.importedAt?.trim() || undefined,
  };
  const empty =
    !out.deliveryMethods?.length &&
    !out.supportTasks?.length &&
    !out.frequency &&
    !out.duration &&
    !out.setting &&
    !out.staffing &&
    !source &&
    !out.importedAt;
  return empty ? undefined : out;
}

export function serviceRowDedupeKey(
  s: Pick<Service | ClientService, "name" | "code">,
): string {
  const code = String(s.code ?? "").trim().toLowerCase();
  if (code) return `c:${code}`;
  const name = String(s.name ?? "").trim().toLowerCase();
  if (name) return `n:${name}`;
  return "";
}

function dspDedupeKey(d: { id?: string; name?: string }): string | null {
  const id = d.id?.trim();
  if (id) return `id:${id}`;
  const name = d.name?.trim();
  if (name) return `name:${name}`;
  return null;
}

function mergeUniqueOutcomeStrings(a: string[] | undefined, b: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...(a ?? []), ...(b ?? [])]) {
    const t = s.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function mergeAssignedDsps(a?: ClientDsp[], b?: ClientDsp[]): ClientDsp[] | undefined {
  const keys = new Set<string>();
  const out: ClientDsp[] = [];
  for (const d of [...(a ?? []), ...(b ?? [])]) {
    const k = dspDedupeKey(d);
    if (!k || keys.has(k)) continue;
    keys.add(k);
    out.push({ id: d.id.trim(), name: (d.name ?? "").trim() });
  }
  return out.length ? out : undefined;
}

/** Pick first non-empty trimmed string, else second. */
function pickStr(a?: string, b?: string): string {
  const x = (a ?? "").trim();
  if (x) return a!.trim();
  const y = (b ?? "").trim();
  return y ? b!.trim() : "";
}

function mergeClientServicesForDedupe(a: ClientService, b: ClientService): ClientService {
  const pickSdrDetails = (): ClientService["sdrDetails"] => {
    const aD = a.sdrDetails;
    const bD = b.sdrDetails;
    const substantive = (x?: ClientService["sdrDetails"]) =>
      !!x &&
      ((x.deliveryMethods?.length ?? 0) > 0 ||
        (x.supportTasks?.length ?? 0) > 0 ||
        !!(x.frequency?.trim() || x.duration?.trim() || x.setting?.trim() || x.staffing?.trim()) ||
        !!(x.source &&
          (x.source.outcomeStatement?.trim() ||
            x.source.serviceCode?.trim() ||
            x.source.serviceName?.trim() ||
            x.source.provider?.trim() ||
            x.source.claimsSource?.trim())));
    if (substantive(aD)) return aD;
    if (substantive(bD)) return bD;
    return aD ?? bD;
  };

  return {
    ...a,
    id: pickStr(a.id, b.id) || a.id,
    name: pickStr(a.name, b.name),
    code: pickStr(a.code, b.code),
    hours: pickStr(a.hours, b.hours),
    totalApprovedHours: pickStr(a.totalApprovedHours, b.totalApprovedHours),
    staffRate: pickStr(a.staffRate, b.staffRate),
    payType: a.payType ?? b.payType,
    clientRate: pickStr(a.clientRate, b.clientRate),
    clientPayType: a.clientPayType ?? b.clientPayType,
    ispEffectiveDate: a.ispEffectiveDate ?? b.ispEffectiveDate,
    startAuthDate: a.startAuthDate ?? b.startAuthDate,
    endAuthDate: a.endAuthDate ?? b.endAuthDate,
    pcptDate: a.pcptDate ?? b.pcptDate,
    sdrStartDate: a.sdrStartDate ?? b.sdrStartDate,
    sdrEndDate: a.sdrEndDate ?? b.sdrEndDate,
    provider: pickStr(a.provider, b.provider) || undefined,
    location: pickStr(a.location, b.location) || undefined,
    claimsSource: pickStr(a.claimsSource, b.claimsSource) || undefined,
    unitType: pickStr(a.unitType, b.unitType) || undefined,
    frequency: pickStr(a.frequency, b.frequency) || undefined,
    totalUnits: pickStr(a.totalUnits, b.totalUnits) || undefined,
    totalCost: pickStr(a.totalCost, b.totalCost) || undefined,
    evvStatus: pickStr(a.evvStatus, b.evvStatus) || undefined,
    evvDescription: pickStr(a.evvDescription, b.evvDescription) || undefined,
    narrative: pickStr(a.narrative, b.narrative) || undefined,
    sdrDetails: pickSdrDetails(),
    assignedDsps: mergeAssignedDsps(a.assignedDsps, b.assignedDsps),
    outcomes: (() => {
      const merged = mergeUniqueOutcomeStrings(a.outcomes, b.outcomes);
      return merged.length ? merged : undefined;
    })(),
  };
}

/** Build ClientService payload from wizard service row; optional outcome hints become `outcomes[]` on the API row. */
export function wizardServiceToClientService(
  svc: Service,
  outcomeStatements?: string[],
): ClientService {
  const outcomes =
    outcomeStatements && outcomeStatements.length > 0
      ? [...new Set(outcomeStatements.map((o) => o.trim()).filter(Boolean))]
      : undefined;
  return {
    id: svc.id,
    name: svc.name || "",
    code: svc.code || "",
    hours: svc.hours || "",
    totalApprovedHours: svc.totalApprovedHours || "",
    staffRate: svc.staffRate || "",
    payType: svc.payType,
    clientRate: svc.clientRate || "",
    clientPayType: svc.clientPayType,
    ispEffectiveDate: toIso(svc.ispEffectiveDate),
    startAuthDate: toIso(svc.startAuthDate),
    endAuthDate: toIso(svc.endAuthDate),
    pcptDate: toIso(svc.pcptDate),
    sdrStartDate: toIso(svc.sdrStartDate),
    sdrEndDate: toIso(svc.sdrEndDate),
    provider: svc.provider?.trim() || undefined,
    location: svc.location?.trim() || undefined,
    claimsSource: svc.claimsSource?.trim() || undefined,
    unitType: svc.unitType?.trim() || undefined,
    frequency: svc.frequency?.trim() || undefined,
    totalUnits: svc.totalUnits?.trim() || undefined,
    totalCost: svc.totalCost?.trim() || undefined,
    evvStatus: svc.evvStatus?.trim() || undefined,
    evvDescription: svc.evvDescription?.trim() || undefined,
    narrative: svc.narrative?.trim() || undefined,
    procedureName: svc.procedureName?.trim() || undefined,
    sdrComputedTotalHours: svc.sdrComputedTotalHours?.trim() || undefined,
    ...((): Partial<Pick<ClientService, "sdrPriorAuthorization">> => {
      const pa = svc.sdrPriorAuthorization;
      if (!pa) return {};
      const next: NonNullable<ClientService["sdrPriorAuthorization"]> = {};
      for (const k of ["startDate", "endDate", "paNumber", "approvedUnitsTillDate"] as const) {
        const v = pa[k];
        if (typeof v === "string" && v.trim()) next[k] = v.trim();
      }
      return Object.keys(next).length ? { sdrPriorAuthorization: next } : {};
    })(),
    ...((): Partial<Pick<ClientService, "sdrWeeklyDistribution">> => {
      const wd = svc.sdrWeeklyDistribution;
      if (!wd || typeof wd !== "object") return {};
      const std = wd.standardLine?.trim();
      const rows =
        wd.rows
          ?.map((r) => ({
            weekRange: r.weekRange?.trim() ?? "",
            units: r.units?.trim() ?? "",
            hours: r.hours?.trim() ?? "",
          }))
          .filter((r) => r.weekRange || r.units || r.hours) ?? [];
      if (!std?.length && !rows.length) return {};
      const next: NonNullable<ClientService["sdrWeeklyDistribution"]> = {
        ...(std ? { standardLine: std } : {}),
        ...(rows.length ? { rows } : {}),
      };
      return { sdrWeeklyDistribution: next };
    })(),
    sdrDetails: svc.sdrDetails ? trimWizardSdrDetailsForApi(svc.sdrDetails) : undefined,
    assignedDsps:
      svc.assignedDsps && svc.assignedDsps.length > 0
        ? svc.assignedDsps
            .filter((d) => d.id?.trim() && d.name?.trim())
            .map((d) => ({ id: d.id.trim(), name: d.name.trim() }))
        : undefined,
    outcomes,
  };
}

/** Canonical nested outcomes for API persistence (no per-service outcome strings; parent holds statement). */
export function wizardOutcomesToApiOutcomes(outcomes: Outcome[]): ClientOutcome[] {
  return outcomes.map((o) => ({
    id: o.id,
    statement: o.statement || "",
    services: o.services.map((s) => wizardServiceToClientService(s)),
  }));
}

/**
 * Flatten outcome-owned services for scheduling/UI: each row includes the parent outcome statement in `outcomes[]`.
 * Does not dedupe — same code may appear once per owning outcome.
 */
export function flattenOutcomeServices(outcomes: ClientOutcome[] | undefined): ClientService[] {
  if (!outcomes?.length) return [];
  const out: ClientService[] = [];
  for (const o of outcomes) {
    const stmt = (o.statement ?? "").trim();
    for (const s of o.services ?? []) {
      const mergedOt = stmt
        ? mergeUniqueOutcomeStrings(s.outcomes, [stmt])
        : [...(s.outcomes ?? [])];
      out.push({
        ...s,
        outcomes: mergedOt.length ? mergedOt : undefined,
      });
    }
  }
  return out;
}

/**
 * Dedupe flat services for compatibility: key by code, else name; merge DSPs and outcome statement lists.
 * @deprecated Not sent on create/update anymore; prefer `wizardOutcomesToApiOutcomes` + server-side normalizer. Kept for tests and legacy tooling.
 */
export function deriveFlatClientServicesFromWizardOutcomes(outcomes: Outcome[]): ClientService[] {
  const map = new Map<string, ClientService>();
  for (const o of outcomes) {
    const stmt = (o.statement ?? "").trim();
    for (const svc of o.services) {
      const key = serviceRowDedupeKey(svc);
      if (!key) continue;
      const next = wizardServiceToClientService(svc, stmt ? [stmt] : []);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, next);
      } else {
        map.set(key, mergeClientServicesForDedupe(existing, next));
      }
    }
  }
  return [...map.values()];
}

/** Outcome statements (unique) that reference a service code (case-insensitive). */
export function findOutcomeStatementsForServiceCode(
  outcomes: ClientOutcome[] | undefined,
  serviceCode: string,
): string[] {
  if (!outcomes?.length) return [];
  const code = serviceCode.trim().toLowerCase();
  if (!code) return [];
  const stmts: string[] = [];
  const seen = new Set<string>();
  for (const o of outcomes) {
    const st = (o.statement ?? "").trim();
    if (!st) continue;
    const has = (o.services ?? []).some(
      (s) => (s.code ?? "").trim().toLowerCase() === code,
    );
    if (has && !seen.has(st)) {
      seen.add(st);
      stmts.push(st);
    }
  }
  return stmts;
}

export function countUniqueAssignedDspsFromOutcomeGroups(
  outcomes: ClientOutcome[] | undefined,
): number {
  if (!outcomes?.length) return 0;
  const keys = new Set<string>();
  for (const o of outcomes) {
    for (const s of o.services ?? []) {
      for (const d of s.assignedDsps ?? []) {
        const k = dspDedupeKey(d);
        if (k) keys.add(k);
      }
    }
  }
  return keys.size;
}

export type ServiceLoadRow = {
  svc: Service;
  /** From legacy API `ClientService.outcomes` (per-service tags). */
  outcomeTags: string[];
};

function newOutcomeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `outcome-${crypto.randomUUID()}`
    : `outcome-${Math.random().toString(16).slice(2)}`;
}

function newServiceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `service-${crypto.randomUUID()}`
    : `service-${Math.random().toString(16).slice(2)}`;
}

/**
 * Migrate legacy flat `services[]` (optional per-service outcome tags) into outcome-owned groups.
 */
export function groupLoadedServicesIntoOutcomes(rows: ServiceLoadRow[]): Outcome[] {
  if (!rows.length) return [];
  const byStatement = new Map<string, Service[]>();
  const unassigned: Service[] = [];

  for (const { svc, outcomeTags } of rows) {
    if (!outcomeTags.length) {
      unassigned.push({ ...svc });
      continue;
    }
    for (const st of outcomeTags) {
      if (!byStatement.has(st)) byStatement.set(st, []);
      byStatement.get(st)!.push({ ...svc, id: newServiceId() });
    }
  }

  const outcomes: Outcome[] = [];
  for (const [statement, svcs] of byStatement) {
    outcomes.push({
      id: newOutcomeId(),
      statement,
      services: svcs.length ? svcs : [createEmptyServiceAuthorization()],
    });
  }
  if (unassigned.length) {
    outcomes.push({
      id: newOutcomeId(),
      statement: UNASSIGNED_OUTCOME_LABEL,
      services: unassigned,
    });
  }
  return outcomes;
}
