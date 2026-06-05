import type { RecentClaim } from "../data/mockClaimsDashboardData";

export type RecentClaimClientGroup = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  claims: RecentClaim[];
};

function getClientKey(claim: RecentClaim) {
  return claim.clientId?.trim() || claim.client.trim() || "unknown";
}

export function groupRecentClaimsByClient(claims: RecentClaim[]): RecentClaimClientGroup[] {
  const grouped = new Map<string, RecentClaimClientGroup>();

  for (const claim of claims) {
    const clientKey = getClientKey(claim);
    const existing = grouped.get(clientKey);

    if (existing) {
      existing.claims.push(claim);
      continue;
    }

    grouped.set(clientKey, {
      clientKey,
      clientName: claim.client,
      clientId: claim.clientId,
      claims: [claim],
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
}
