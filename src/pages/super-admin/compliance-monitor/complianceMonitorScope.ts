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

export function buildScopedComplianceQuery(
  params: ComplianceQueryParams,
  scope: ComplianceMonitorScope | null,
): ComplianceQueryParams {
  return {
    ...params,
    ...(scope ? { agencyId: scope.agencyId } : {}),
  };
}
