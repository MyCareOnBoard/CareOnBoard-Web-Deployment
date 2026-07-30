import type { OperationalBillingRequestContext } from "./types";

export function operationalAgencyId(context: OperationalBillingRequestContext): string {
  const agencyId = context.agencyId.trim();
  if (!agencyId) {
    throw new Error("Operational billing agencyId is required");
  }
  return agencyId;
}

export function withOperationalAgency<T extends object>(
  context: OperationalBillingRequestContext,
  params: T,
): Omit<T, "agencyId"> & { agencyId: string } {
  const agencyId = operationalAgencyId(context);

  const { agencyId: _untrustedAgencyId, ...rest } = params as T & { agencyId?: unknown };
  return { ...rest, agencyId } as Omit<T, "agencyId"> & { agencyId: string };
}

export function operationalBillingCacheKey(
  namespace: string,
  context: OperationalBillingRequestContext,
  params: Record<string, unknown> = {},
): string {
  const scoped = withOperationalAgency(context, params);
  return JSON.stringify([namespace, scoped]);
}
