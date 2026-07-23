import type { ComplianceQueryParams } from "./complianceApi";

export type ComplianceMonitorScope = {
  agencyId: string;
  agencyName: string;
};

export function parseComplianceMonitorScope(
  search: string,
): ComplianceMonitorScope | null {
  const params = new URLSearchParams(search);
  const agencyId = params.get("agencyId")?.trim();

  if (!agencyId) return null;

  return {
    agencyId,
    agencyName: params.get("agencyName")?.trim() || "Selected agency",
  };
}

export function parseComplianceMonitorTextSearch(search: string): string {
  return new URLSearchParams(search).get("search")?.trim() || "";
}

export function buildComplianceMonitorLocationSearch({
  scope,
  search,
}: {
  scope: ComplianceMonitorScope | null;
  search: string;
}): string {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (scope) {
    params.set("agencyId", scope.agencyId);
    params.set("agencyName", scope.agencyName);
  }
  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function buildScopedComplianceQuery(
  params: ComplianceQueryParams,
  scope: ComplianceMonitorScope | null,
  search = "",
): ComplianceQueryParams {
  const normalizedSearch = search.trim();

  return {
    ...params,
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(scope ? { agencyId: scope.agencyId } : {}),
  };
}
