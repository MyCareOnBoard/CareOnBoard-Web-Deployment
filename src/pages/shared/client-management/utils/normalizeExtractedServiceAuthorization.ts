import type { ExtractionServiceRow } from "../types/clientExtraction";
import type { Service, ServicePayType } from "../types/formData";

const NO_DATA_TOKENS = new Set([
  "n/a",
  "na",
  "none",
  "not applicable",
  "not available",
  "unknown",
  "-",
  "--",
]);

function isExtractedNoDataToken(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  const s = String(v).trim().toLowerCase();
  if (!s) return true;
  return NO_DATA_TOKENS.has(s);
}

export function stripExtractedMoney(raw: string | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || isExtractedNoDataToken(s)) return "";
  return s.replace(/[$,\s]/g, "");
}

export function normalizeExtractedClientPayType(
  raw: string | undefined,
  unitType?: string,
  name?: string,
  code?: string,
): ServicePayType | undefined {
  const fromRaw = normalizePayTypeToken(raw);
  if (fromRaw) return fromRaw;
  const fromUnit = normalizePayTypeToken(unitType);
  if (fromUnit) return fromUnit;
  const blob = `${name ?? ""} ${code ?? ""}`.toLowerCase();
  if (/\btransport(ation)?\b|\bmileage\b|\bnemt\b/i.test(blob)) return "mile";
  return undefined;
}

function normalizePayTypeToken(raw: string | undefined): ServicePayType | undefined {
  if (!raw?.trim() || isExtractedNoDataToken(raw)) return undefined;
  const orig = String(raw).trim();
  const t = orig.toLowerCase();

  if (t === "service(s)" || t === "services" || t === "service") return "hourly";
  if (/^service\s*\(?s\)?$/i.test(orig.trim())) return "hourly";
  if (t === "hourly" || t === "15-min" || t === "daily" || t === "mile") return t as ServicePayType;
  if (t.includes("15") && t.includes("min")) return "15-min";
  if (t.includes("mile") || t === "mi" || t.includes("per mile")) return "mile";
  if (t.includes("hour") || t === "hr" || (t.includes("unit") && t.includes("hour"))) return "hourly";
  if (t.includes("day")) return "daily";
  return undefined;
}

function strOrUndef(x: string | undefined): string | undefined {
  const v = x?.trim();
  if (!v || isExtractedNoDataToken(x)) return undefined;
  return v;
}

type LegacyTotalHoursRow = Record<string, string | undefined>;

function coalesceLegacyTotalHours(row: LegacyTotalHoursRow): string | undefined {
  const direct = strOrUndef(row.totalHours);
  if (direct) return direct;
  return strOrUndef(row.totalApprovedHours) ?? strOrUndef(row.sdrComputedTotalHours);
}

/** Resolve totalHours from extraction row (legacy keys supported for cached API responses). */
export function resolveExtractedTotalHours(row: ExtractionServiceRow): string | undefined {
  return coalesceLegacyTotalHours(row as LegacyTotalHoursRow);
}

export function resolveExtractedClientRate(row: ExtractionServiceRow): string {
  const cRaw = strOrUndef(row.clientRate);
  const sRaw = strOrUndef(row.rate);
  const raw = cRaw ?? sRaw;
  return raw ? stripExtractedMoney(raw) : "";
}

/** Map extraction authorization scalars onto a partial Service patch (ISP bootstrap). */
export function applyExtractedAuthorizationFields(row: ExtractionServiceRow): Partial<Service> {
  const patch: Partial<Service> = {};

  const clientRate = resolveExtractedClientRate(row);
  if (clientRate) patch.clientRate = clientRate;

  const clientPayType = normalizeExtractedClientPayType(
    row.clientPayType,
    row.unitType,
    row.name,
    row.code,
  );
  if (clientPayType) patch.clientPayType = clientPayType;

  const totalCost = stripExtractedMoney(strOrUndef(row.totalCost));
  if (totalCost) patch.totalCost = totalCost;

  const totalUnits = strOrUndef(row.totalUnits);
  if (totalUnits) patch.totalUnits = totalUnits;

  const unitType = strOrUndef(row.unitType);
  if (unitType) patch.unitType = unitType;

  const totalHours = resolveExtractedTotalHours(row);
  if (totalHours) patch.totalHours = totalHours;

  return patch;
}

/**
 * SDR import: non-empty extracted authorization scalars always replace wizard values.
 * Pass weeklyDerivedTotalHours only when weekly distribution was merged onto the service.
 */
export function applySdrAuthorizationOverride(
  row: ExtractionServiceRow,
  options?: { weeklyDerivedTotalHours?: string },
): Partial<Service> {
  const patch: Partial<Service> = {};
  const incoming = applyExtractedAuthorizationFields(row);

  const authKeys: (keyof Service)[] = [
    "clientRate",
    "clientPayType",
    "totalCost",
    "totalUnits",
    "unitType",
    "totalHours",
  ];

  for (const key of authKeys) {
    const val = incoming[key];
    if (val === undefined || val === null) continue;
    if (typeof val === "string" && !val.trim()) continue;
    (patch as Record<string, unknown>)[key as string] = val;
  }

  const weeklyTotal = options?.weeklyDerivedTotalHours?.trim();
  if (!patch.totalHours && weeklyTotal) {
    patch.totalHours = weeklyTotal;
  }

  return patch;
}
