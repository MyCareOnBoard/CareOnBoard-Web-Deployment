import type {
  AnalyticsFilters,
  AnalyticsReportScope,
  AnalyticsSummaryData,
} from "@/lib/api/reports";
export const RATE_HELPER =
  "Limited check: expired staff documents and unsigned HHA Form 485s. Missing documents and other requirements are not included.";
export const FLAGS_HELPER =
  "Expired staff documents, incidents and unsigned HHA Form 485s. These flags are not an overall compliance measure.";
export const INDICATORS_HELPER =
  "Categories use different units and may concern the same person. Indicator findings and Document & incident flags have different ingredients and are not expected to match.";
export const CURRENT_RECORDS_HELPER =
  "Review current records. These records may differ from the indicator's reporting period and calculation. Even today's counts can differ.";
export function parsePrintFilters(
  params: URLSearchParams,
): AnalyticsFilters | null {
  if (
    [...params.keys()].some(
      (key) =>
        !["startDate", "endDate", "mode"].includes(key) ||
        params.getAll(key).length !== 1,
    )
  )
    return null;
  const startDate = params.get("startDate"),
    endDate = params.get("endDate"),
    mode = params.get("mode");
  const date = (s: string | null): s is string =>
    !!s &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !date(startDate) ||
    !date(endDate) ||
    startDate > endDate ||
    (mode !== null && !["ddd", "hha", "sc"].includes(mode))
  )
    return null;
  return { startDate, endDate, ...(mode ? { mode } : {}) };
}
export function printParams(
  scope?: AnalyticsReportScope,
): URLSearchParams | null {
  if (!scope || !Number.isFinite(Date.parse(scope.checkedAt))) return null;
  const params = new URLSearchParams({
    startDate: scope.startDate,
    endDate: scope.endDate,
    ...(scope.mode ? { mode: scope.mode } : {}),
  });
  return parsePrintFilters(params) ? params : null;
}
export function matchesReportScope(
  scope: AnalyticsReportScope | undefined,
  filters: AnalyticsFilters,
) {
  return (
    !!printParams(scope) &&
    scope?.mode === (filters.mode || null) &&
    (!filters.startDate || scope.startDate === filters.startDate) &&
    (!filters.endDate || scope.endDate === filters.endDate)
  );
}
export function rateState(
  summary: Pick<
    AnalyticsSummaryData,
    "overview" | "populationTotal" | "complianceAvailability"
  >,
) {
  const state = summary.complianceAvailability?.rate;
  if (state === "restricted") return state;
  if (state === "empty" && summary.populationTotal === 0) return "empty";
  const value = summary.overview.complianceRate?.value;
  return state === "available" &&
    Number.isInteger(summary.populationTotal) &&
    summary.populationTotal! > 0 &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? "available"
    : "unavailable";
}
