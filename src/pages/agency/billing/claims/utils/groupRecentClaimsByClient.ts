import type { RecentClaim } from "../data/mockClaimsDashboardData";

export type RecentClaimClientGroup = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  agencyId?: string;
  agencyName?: string;
  claims: RecentClaim[];
  /** A client is wholly claims or out-of-pocket; drives the badge + generate action. */
  billingDirection: "claims" | "out-of-pocket";
};

function getClientKey(claim: RecentClaim, showAgency: boolean, groupByBillingPeriod: boolean) {
  const clientKey = claim.clientId?.trim() || claim.client.trim() || "unknown";
  const agencyKey = showAgency ? `${claim.agencyId?.trim() || "unknown-agency"}:${clientKey}` : clientKey;
  if (!groupByBillingPeriod) return agencyKey;

  return `${agencyKey}:${claim.serviceCode}:${claim.weekRange ?? ""}`;
}

export function groupRecentClaimsByClient(
  claims: RecentClaim[],
  { showAgency = false, groupByBillingPeriod = false }: { showAgency?: boolean; groupByBillingPeriod?: boolean } = {},
): RecentClaimClientGroup[] {
  const grouped = new Map<string, RecentClaimClientGroup>();

  for (const claim of claims) {
    const clientKey = getClientKey(claim, showAgency, groupByBillingPeriod);
    const existing = grouped.get(clientKey);

    if (existing) {
      existing.claims.push(claim);
      continue;
    }

    grouped.set(clientKey, {
      clientKey,
      clientName: claim.client,
      clientId: claim.clientId,
      agencyId: showAgency ? claim.agencyId : undefined,
      agencyName: showAgency ? claim.agencyName : undefined,
      claims: [claim],
      billingDirection: claim.billingDirection === "out-of-pocket" ? "out-of-pocket" : "claims",
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
}
